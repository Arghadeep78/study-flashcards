import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import PdfNote from '../models/PdfNote.js';
import { extractDriveId, fetchDrivePdf } from '../lib/drive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// sections arrive as a JSON string in multipart form data, or an array in JSON bodies.
function parseSections(raw) {
  let sections = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    sections = JSON.parse(raw);
  }
  if (!Array.isArray(sections)) throw new Error('sections must be an array');
  return sections.map((s, i) => {
    const startPage = Number(s.startPage);
    const endPage = Number(s.endPage);
    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
      throw new Error(`section ${i + 1} has an invalid page range`);
    }
    const subtopic = (s.subtopic ?? '').toString().trim();
    if (!subtopic) throw new Error(`section ${i + 1} subtopic is required`);
    const title = (s.title ?? '').toString().trim();
    const difficulty = ['Easy', 'Medium', 'Hard'].includes(s.difficulty) ? s.difficulty : '';
    return { subtopic, title, difficulty, startPage, endPage };
  });
}

async function removeFileQuietly(fileName) {
  if (!fileName) return;
  try { await fs.unlink(path.join(UPLOADS_DIR, fileName)); } catch { /* already gone */ }
}

export const getPdfNotes = async (_req, res) => {
  try {
    const notes = await PdfNote.find().sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPdfNote = async (req, res) => {
  try {
    const note = await PdfNote.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ error: 'PDF note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create from an uploaded file (multer puts it on req.file).
  export const createFromUpload = async (req, res) => {
    try {
      const { topic, subtopic } = req.body;
      if (!topic?.trim()) { await removeFileQuietly(req.file?.filename); return res.status(400).json({ error: 'topic is required' }); }
      if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
  
      const sections = parseSections(req.body.sections);
      if (sections.length === 0) return res.status(400).json({ error: 'At least one section is required' });

      const notes = await Promise.all(sections.map(s =>
        PdfNote.create({
          topic: topic.trim(),
          subtopic: s.subtopic,
          title: s.title || s.subtopic,
          difficulty: s.difficulty,
          sourceType: 'file',
          fileName: req.file.filename,
          originalName: req.file.originalname ?? '',
          fileUrl: `/uploads/${req.file.filename}`,
          startPage: s.startPage,
          endPage: s.endPage,
        })
      ));
    res.status(201).json(notes);
  } catch (err) {
    await removeFileQuietly(req.file?.filename);
    res.status(400).json({ error: err.message });
  }
};

// Create from a Google Drive link — download the bytes to local disk now.
  export const createFromDrive = async (req, res) => {
    try {
      const { topic, subtopic, driveLink } = req.body;
      if (!topic?.trim()) return res.status(400).json({ error: 'topic is required' });
      const id = extractDriveId(driveLink);
      if (!id) return res.status(400).json({ error: 'Could not read a Google Drive file id from that link' });
  
      const sections = parseSections(req.body.sections);
      if (sections.length === 0) return res.status(400).json({ error: 'At least one section is required' });

      const buf = await fetchDrivePdf(id);
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.pdf`;
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOADS_DIR, fileName), buf);

      const notes = await Promise.all(sections.map(s =>
        PdfNote.create({
          topic: topic.trim(),
          subtopic: s.subtopic,
          title: s.title || s.subtopic,
          difficulty: s.difficulty,
          sourceType: 'drive',
          driveLink: driveLink.trim(),
          fileName,
          fileUrl: `/uploads/${fileName}`,
          startPage: s.startPage,
          endPage: s.endPage,
        })
      ));
    res.status(201).json(notes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Re-download a drive-sourced note's PDF, replacing the local copy.
export const refreshFromDrive = async (req, res) => {
  try {
    const note = await PdfNote.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'PDF note not found' });
    if (note.sourceType !== 'drive' || !note.driveLink) {
      return res.status(400).json({ error: 'This note has no Drive link to refresh from' });
    }
    const id = extractDriveId(note.driveLink);
    if (!id) return res.status(400).json({ error: 'Stored Drive link is invalid' });

    const buf = await fetchDrivePdf(id);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buf);

    const oldFile = note.fileName;
    
    await PdfNote.updateMany(
      { driveLink: note.driveLink },
      { $set: { fileName, fileUrl: `/uploads/${fileName}` } }
    );
    
    await removeFileQuietly(oldFile); // drop the stale copy only after the new one is saved

    const updatedNote = await PdfNote.findById(req.params.id);
    res.json(updatedNote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePdfNote = async (req, res) => {
  try {
    const update = {};
    if (req.body.topic !== undefined) update.topic = req.body.topic.trim();
    if (req.body.title !== undefined) update.title = req.body.title.trim();
    if (req.body.subtopic !== undefined) update.subtopic = req.body.subtopic.trim();
    if (req.body.startPage !== undefined) update.startPage = Number(req.body.startPage);
    if (req.body.endPage !== undefined) update.endPage = Number(req.body.endPage);
    if (req.body.boxLevel !== undefined) update.boxLevel = Number(req.body.boxLevel);
    if (req.body.archived !== undefined) update.archived = Boolean(req.body.archived);
    if (req.body.difficulty !== undefined) update.difficulty = ['Easy', 'Medium', 'Hard'].includes(req.body.difficulty) ? req.body.difficulty : '';

    if (req.body.sections !== undefined) {
      const sections = parseSections(req.body.sections);
      if (sections.length > 0) {
        update.title = sections[0].title;
        update.startPage = sections[0].startPage;
        update.endPage = sections[0].endPage;
      }
    }

    const note = await PdfNote.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ error: 'PDF note not found' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// --- Section review (Leitner) ---

const FINAL_BOX = 3;
const BOX_THRESHOLD_DAYS = { 0: 0, 1: 3, 2: 7, 3: 12 };
const MS_PER_DAY = 86_400_000;

function sectionShape(note) {
  return {
    _id: note._id,
    noteId: note._id,
    noteTopic: note.topic,
    noteTitle: note.title,
    notePdfName: note.originalName || '',
    noteFileUrl: note.fileUrl,
    subtopic: note.subtopic,
    difficulty: note.difficulty || '',
    startPage: note.startPage,
    endPage: note.endPage,
    boxLevel: note.boxLevel ?? 0,
    lastReviewed: note.lastReviewed,
    weak: note.weak ?? false,
    visitCount: note.visitCount ?? 0,
    passCount: note.passCount ?? 0,
    failCount: note.failCount ?? 0,
  };
}

export const reviewSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { rating } = req.body; // 'pass' | 'fail'
    const note = await PdfNote.findById(sectionId);
    if (!note) return res.status(404).json({ error: 'Section not found' });

    note.lastReviewed = new Date();
    note.visitCount = (note.visitCount ?? 0) + 1;
    if (rating === 'pass') note.passCount = (note.passCount ?? 0) + 1;
    else note.failCount = (note.failCount ?? 0) + 1;

    if (rating !== 'pass') {
      note.boxLevel = 0;
    } else if (note.boxLevel < FINAL_BOX) {
      note.boxLevel = note.boxLevel + 1;
    }
    // Correct on box 3 — stays in box 3, resets the 12-day timer via lastReviewed

    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleSectionWeak = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const note = await PdfNote.findById(sectionId);
    if (!note) return res.status(404).json({ error: 'Section not found' });
    note.weak = !note.weak;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Returns { noteId, noteTopic, noteTitle, noteFileUrl, section } objects that are due.
export const getDueSections = async (req, res) => {
  try {
    const now = Date.now();
    const notes = await PdfNote.find({}).lean();

    const due = [];
    for (const note of notes) {
      if (note.archived) continue;
      const box = note.boxLevel ?? 0;
      const days = BOX_THRESHOLD_DAYS[box] ?? 0;
      const cutoff = now - days * MS_PER_DAY;
      const lastMs = note.lastReviewed ? new Date(note.lastReviewed).getTime() : null;
      const isDue = days === 0 || lastMs === null || lastMs <= cutoff;
      if (isDue) due.push(sectionShape(note));
    }

    // Box 0 first, then by lastReviewed asc (nulls first)
    due.sort((a, b) => {
      if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
      if (!a.lastReviewed) return -1;
      if (!b.lastReviewed) return 1;
      return new Date(a.lastReviewed) - new Date(b.lastReviewed);
    });

    res.json(due);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRandomSections = async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 10, 100);
    const notes = await PdfNote.find({ archived: { $ne: true } }).lean();

    const all = notes.map(sectionShape);

    // Weighted sample — same algorithm as cards (recency × scarcity × box × subtopic novelty)
    const HALF_LIFE = 7;
    function weightedSample(pool, n) {
      if (pool.length <= n) {
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
      const now = Date.now();
      const base = pool.map((s) => {
        const scarcity = 1 / ((s.visitCount ?? 0) + 1);
        const recency = s.lastReviewed
          ? 1 - Math.exp(-((now - new Date(s.lastReviewed).getTime()) / MS_PER_DAY) / HALF_LIFE)
          : 1;
        const box = (FINAL_BOX + 1 - (s.boxLevel ?? 0)) / (FINAL_BOX + 1);
        return recency * scarcity * box;
      });
      const selected = [];
      const avail = [...pool.keys()];
      const b = [...base];
      const subtopicPicks = {};
      for (let i = 0; i < n && avail.length > 0; i++) {
        const effective = avail.map((poolIdx, j) => {
          const sub = pool[poolIdx].subtopic || '';
          return b[j] * (1 / ((subtopicPicks[sub] ?? 0) + 1));
        });
        const total = effective.reduce((s, x) => s + x, 0);
        let r = Math.random() * total;
        let picked = avail.length - 1;
        for (let j = 0; j < avail.length; j++) { r -= effective[j]; if (r <= 0) { picked = j; break; } }
        const item = pool[avail[picked]];
        selected.push(item);
        const sub = item.subtopic || '';
        subtopicPicks[sub] = (subtopicPicks[sub] ?? 0) + 1;
        avail.splice(picked, 1);
        b.splice(picked, 1);
      }
      return selected;
    }

    res.json(weightedSample(all, count));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSelectiveSections = async (req, res) => {
  try {
    const { topics, subtopics, count } = req.body;
    const query = { archived: { $ne: true }, ...(topics?.length ? { topic: { $in: topics } } : {}) };
    const notes = await PdfNote.find(query).lean();

    const all = [];
    for (const note of notes) {
      if (subtopics?.length && !subtopics.includes(note.subtopic)) {
        continue;
      }
      all.push(sectionShape(note));
    }

    const wantAll = !count || parseInt(count) === 0;
    const limit = wantAll ? all.length : Math.min(parseInt(count), 2000);

    // Sort pool: unseen first, then longest-unseen (lastReviewed asc, nulls treated as unseen/first)
    all.sort((a, b) => {
      const aUnseen = (a.visitCount ?? 0) === 0 ? 1 : 0;
      const bUnseen = (b.visitCount ?? 0) === 0 ? 1 : 0;
      if (aUnseen !== bUnseen) return bUnseen - aUnseen;

      const aMs = a.lastReviewed ? new Date(a.lastReviewed).getTime() : 0;
      const bMs = b.lastReviewed ? new Date(b.lastReviewed).getTime() : 0;
      return aMs - bMs;
    });

    // Slice to limit * 5 to match flashcards selective behavior
    const poolLimit = wantAll ? all.length : limit * 5;
    const pool = all.slice(0, poolLimit);

    const HALF_LIFE = 7;
    function weightedSample(p, n) {
      if (p.length <= n) return p;
      const now = Date.now();
      const base = p.map((s) => {
        const scarcity = 1 / ((s.visitCount ?? 0) + 1);
        const recency = s.lastReviewed
          ? 1 - Math.exp(-((now - new Date(s.lastReviewed).getTime()) / MS_PER_DAY) / HALF_LIFE)
          : 1;
        const box = (FINAL_BOX + 1 - (s.boxLevel ?? 0)) / (FINAL_BOX + 1);
        return recency * scarcity * box;
      });
      const selected = [];
      const avail = [...p.keys()];
      const b = [...base];
      const subtopicPicks = {};
      for (let i = 0; i < n && avail.length > 0; i++) {
        const effective = avail.map((poolIdx, j) => {
          const sub = p[poolIdx].subtopic || '';
          return b[j] * (1 / ((subtopicPicks[sub] ?? 0) + 1));
        });
        const total = effective.reduce((s, x) => s + x, 0);
        let r = Math.random() * total;
        let picked = avail.length - 1;
        for (let j = 0; j < avail.length; j++) { r -= effective[j]; if (r <= 0) { picked = j; break; } }
        const item = p[avail[picked]];
        selected.push(item);
        const sub = item.subtopic || '';
        subtopicPicks[sub] = (subtopicPicks[sub] ?? 0) + 1;
        avail.splice(picked, 1);
        b.splice(picked, 1);
      }
      return selected;
    }

    res.json(weightedSample(pool, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getWeakSections = async (req, res) => {
  try {
    const notes = await PdfNote.find({ weak: true, archived: { $ne: true } }).lean();
    const weak = notes.map(sectionShape);
    weak.sort((a, b) => {
      if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
      if (!a.lastReviewed) return -1;
      if (!b.lastReviewed) return 1;
      return new Date(a.lastReviewed) - new Date(b.lastReviewed);
    });
    res.json(weak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePdfNote = async (req, res) => {
  try {
    const note = await PdfNote.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'PDF note not found' });
    
    // Check if any other note still uses this file
    const stillUsed = await PdfNote.exists({ fileName: note.fileName });
    if (!stillUsed) {
      await removeFileQuietly(note.fileName);
    }
    
    res.json({ message: 'PDF note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
