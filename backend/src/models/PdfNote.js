import mongoose from 'mongoose';

const pdfNoteSchema = new mongoose.Schema({
  // Global "topic" for the whole PDF — analogous to a deck/flashcard topic.
  topic: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },

  // How the PDF originally arrived. Either way, the bytes live on local disk
  // under /uploads and Mongo only stores metadata + the path.
  sourceType: { type: String, enum: ['file', 'drive'], required: true },
  fileName: { type: String, default: '' },       // stored filename on disk
  originalName: { type: String, default: '' },   // original upload filename (e.g. "notes.pdf")
  fileUrl: { type: String, default: '' },         // served path, e.g. /uploads/<file>
  driveLink: { type: String, default: '' },       // original Drive share link (for refresh re-download)

  // Section specific properties, now flattened
  subtopic: { type: String, default: '', trim: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', ''], default: '' },
  startPage: { type: Number, required: true, min: 1 },
  endPage: { type: Number, required: true, min: 1 },
  
  // Leitner review state — mirrors Card schema
  boxLevel: { type: Number, default: 0, min: 0, max: 3 },
  archived: { type: Boolean, default: false },
  lastReviewed: { type: Date, default: null },
  weak: { type: Boolean, default: false },
  visitCount: { type: Number, default: 0 },
  passCount: { type: Number, default: 0 },
  failCount: { type: Number, default: 0 },
}, { timestamps: true });

pdfNoteSchema.index({ topic: 1 });

export default mongoose.model('PdfNote', pdfNoteSchema);
