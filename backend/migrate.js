import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flashcards';

const pdfNoteSchema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true },
  title: { type: String, default: '', trim: true },
  sourceType: { type: String, enum: ['file', 'drive'], required: true },
  fileName: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  driveLink: { type: String, default: '' },
  subtopic: { type: String, default: '', trim: true },
  startPage: { type: Number, min: 1 },
  endPage: { type: Number, min: 1 },
  boxLevel: { type: Number, default: 0, min: 0, max: 2 },
  archived: { type: Boolean, default: false },
  lastReviewed: { type: Date, default: null },
  weak: { type: Boolean, default: false },
  visitCount: { type: Number, default: 0 },
  sections: { type: Array, default: () => [] } // To read old data
}, { timestamps: true });

const PdfNote = mongoose.model('PdfNote', pdfNoteSchema);

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const oldNotes = await PdfNote.find({ sections: { $exists: true, $ne: [] } });
  console.log(`Found ${oldNotes.length} old grouped notes to migrate`);

  for (const note of oldNotes) {
    if (note.sections && note.sections.length > 0) {
      // Create new flat notes for each section
      const newNotes = note.sections.map(s => ({
        topic: note.topic,
        title: note.title,
        sourceType: note.sourceType,
        fileName: note.fileName,
        fileUrl: note.fileUrl,
        driveLink: note.driveLink,
        subtopic: s.subtopic || '',
        startPage: s.startPage || 1,
        endPage: s.endPage || 1,
        boxLevel: s.boxLevel || 0,
        archived: s.archived || false,
        lastReviewed: s.lastReviewed || null,
        weak: s.weak || false,
        visitCount: s.visitCount || 0
      }));
      
      await PdfNote.insertMany(newNotes);
      // Delete old grouped note
      await PdfNote.findByIdAndDelete(note._id);
      console.log(`Migrated note ${note._id} into ${newNotes.length} flat notes`);
    } else {
      // Just set default if empty sections but still has sections array
      note.subtopic = '';
      note.startPage = 1;
      note.endPage = 1;
      note.sections = undefined;
      await note.save();
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(console.error);
