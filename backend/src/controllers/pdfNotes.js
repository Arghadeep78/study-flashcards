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
    return { subtopic: (s.subtopic ?? '').toString().trim(), startPage, endPage };
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
    const { topic, title } = req.body;
    if (!topic?.trim()) { await removeFileQuietly(req.file?.filename); return res.status(400).json({ error: 'topic is required' }); }
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const sections = parseSections(req.body.sections);
    const note = await PdfNote.create({
      topic: topic.trim(),
      title: (title ?? '').trim(),
      sourceType: 'file',
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      sections,
    });
    res.status(201).json(note);
  } catch (err) {
    await removeFileQuietly(req.file?.filename);
    res.status(400).json({ error: err.message });
  }
};

// Create from a Google Drive link — download the bytes to local disk now.
export const createFromDrive = async (req, res) => {
  try {
    const { topic, title, driveLink } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'topic is required' });
    const id = extractDriveId(driveLink);
    if (!id) return res.status(400).json({ error: 'Could not read a Google Drive file id from that link' });

    const sections = parseSections(req.body.sections);
    const buf = await fetchDrivePdf(id);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buf);

    const note = await PdfNote.create({
      topic: topic.trim(),
      title: (title ?? '').trim(),
      sourceType: 'drive',
      driveLink: driveLink.trim(),
      fileName,
      fileUrl: `/uploads/${fileName}`,
      sections,
    });
    res.status(201).json(note);
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
    note.fileName = fileName;
    note.fileUrl = `/uploads/${fileName}`;
    await note.save();
    await removeFileQuietly(oldFile); // drop the stale copy only after the new one is saved

    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePdfNote = async (req, res) => {
  try {
    const update = {};
    if (req.body.topic !== undefined) update.topic = req.body.topic.trim();
    if (req.body.title !== undefined) update.title = req.body.title.trim();
    if (req.body.sections !== undefined) update.sections = parseSections(req.body.sections);

    const note = await PdfNote.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ error: 'PDF note not found' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// --- Section review (Leitner) ---

const FINAL_BOX = 2;
const BOX_THRESHOLD_DAYS = { 0: 0, 1: 3, 2: 7 };
const MS_PER_DAY = 86_400_000;

export const reviewSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { rating } = req.body; // 'pass' | 'fail'
    const note = await PdfNote.findOne({ 'sections._id': sectionId });
    if (!note) return res.status(404).json({ error: 'Section not found' });

    const section = note.sections.id(sectionId);
    section.lastReviewed = new Date();
    section.visitCount = (section.visitCount ?? 0) + 1;

    if (rating !== 'pass') {
      section.boxLevel = 0;
    } else if (section.boxLevel < FINAL_BOX) {
      section.boxLevel = section.boxLevel + 1;
    }
    // At FINAL_BOX a correct answer keeps it there (no archiving for PDF sections)

    await note.save();
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleSectionWeak = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const note = await PdfNote.findOne({ 'sections._id': sectionId });
    if (!note) return res.status(404).json({ error: 'Section not found' });
    const section = note.sections.id(sectionId);
    section.weak = !section.weak;
    await note.save();
    res.json(section);
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
      for (const s of (note.sections ?? [])) {
        const box = s.boxLevel ?? 0;
        const days = BOX_THRESHOLD_DAYS[box] ?? 0;
        const cutoff = now - days * MS_PER_DAY;
        const lastMs = s.lastReviewed ? new Date(s.lastReviewed).getTime() : null;
        const isDue = days === 0 || lastMs === null || lastMs <= cutoff;
        if (isDue) {
          due.push({
            _id: s._id,
            noteId: note._id,
            noteTopic: note.topic,
            noteTitle: note.title,
            noteFileUrl: note.fileUrl,
            subtopic: s.subtopic,
            startPage: s.startPage,
            endPage: s.endPage,
            boxLevel: s.boxLevel ?? 0,
            lastReviewed: s.lastReviewed,
            weak: s.weak ?? false,
            visitCount: s.visitCount ?? 0,
          });
        }
      }
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
    const notes = await PdfNote.find({}).lean();

    const all = [];
    for (const note of notes) {
      for (const s of (note.sections ?? [])) {
        all.push({
          _id: s._id,
          noteId: note._id,
          noteTopic: note.topic,
          noteTitle: note.title,
          noteFileUrl: note.fileUrl,
          subtopic: s.subtopic,
          startPage: s.startPage,
          endPage: s.endPage,
          boxLevel: s.boxLevel ?? 0,
          lastReviewed: s.lastReviewed,
          weak: s.weak ?? false,
          visitCount: s.visitCount ?? 0,
        });
      }
    }

    // Weighted sample — same algorithm as cards
    const HALF_LIFE = 7;
    function weightedSample(pool, n) {
      if (pool.length <= n) return pool;
      const now = Date.now();
      const weights = pool.map((s) => {
        const scarcity = 1 / ((s.visitCount ?? 0) + 1);
        const recency = s.lastReviewed
          ? 1 - Math.exp(-((now - new Date(s.lastReviewed).getTime()) / MS_PER_DAY) / HALF_LIFE)
          : 1;
        return recency * scarcity;
      });
      const selected = [];
      const avail = [...pool.keys()];
      const w = [...weights];
      for (let i = 0; i < n && avail.length > 0; i++) {
        const total = w.reduce((s, x) => s + x, 0);
        let r = Math.random() * total;
        let picked = avail.length - 1;
        for (let j = 0; j < avail.length; j++) { r -= w[j]; if (r <= 0) { picked = j; break; } }
        selected.push(pool[avail[picked]]);
        avail.splice(picked, 1);
        w.splice(picked, 1);
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
    const { noteIds, count } = req.body;
    const query = noteIds?.length ? { _id: { $in: noteIds } } : {};
    const notes = await PdfNote.find(query).lean();

    const all = [];
    for (const note of notes) {
      for (const s of (note.sections ?? [])) {
        all.push({
          _id: s._id,
          noteId: note._id,
          noteTopic: note.topic,
          noteTitle: note.title,
          noteFileUrl: note.fileUrl,
          subtopic: s.subtopic,
          startPage: s.startPage,
          endPage: s.endPage,
          boxLevel: s.boxLevel ?? 0,
          lastReviewed: s.lastReviewed,
          weak: s.weak ?? false,
          visitCount: s.visitCount ?? 0,
        });
      }
    }

    const wantAll = !count || parseInt(count) === 0;
    const limit = wantAll ? all.length : Math.min(parseInt(count), 2000);

    const HALF_LIFE = 7;
    function weightedSample(pool, n) {
      if (pool.length <= n) return pool;
      const now = Date.now();
      const weights = pool.map((s) => {
        const scarcity = 1 / ((s.visitCount ?? 0) + 1);
        const recency = s.lastReviewed
          ? 1 - Math.exp(-((now - new Date(s.lastReviewed).getTime()) / MS_PER_DAY) / HALF_LIFE)
          : 1;
        return recency * scarcity;
      });
      const selected = [];
      const avail = [...pool.keys()];
      const w = [...weights];
      for (let i = 0; i < n && avail.length > 0; i++) {
        const total = w.reduce((s, x) => s + x, 0);
        let r = Math.random() * total;
        let picked = avail.length - 1;
        for (let j = 0; j < avail.length; j++) { r -= w[j]; if (r <= 0) { picked = j; break; } }
        selected.push(pool[avail[picked]]);
        avail.splice(picked, 1);
        w.splice(picked, 1);
      }
      return selected;
    }

    res.json(weightedSample(all, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getWeakSections = async (req, res) => {
  try {
    const notes = await PdfNote.find({}).lean();
    const weak = [];
    for (const note of notes) {
      for (const s of (note.sections ?? [])) {
        if (s.weak) {
          weak.push({
            _id: s._id,
            noteId: note._id,
            noteTopic: note.topic,
            noteTitle: note.title,
            noteFileUrl: note.fileUrl,
            subtopic: s.subtopic,
            startPage: s.startPage,
            endPage: s.endPage,
            boxLevel: s.boxLevel ?? 0,
            lastReviewed: s.lastReviewed,
            weak: true,
            visitCount: s.visitCount ?? 0,
          });
        }
      }
    }
    weak.sort((a, b) => a.boxLevel - b.boxLevel || (a.lastReviewed ? 1 : -1));
    res.json(weak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePdfNote = async (req, res) => {
  try {
    const note = await PdfNote.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'PDF note not found' });
    await removeFileQuietly(note.fileName);
    res.json({ message: 'PDF note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
