import mongoose from 'mongoose';

// A section is a contiguous (or single) page range within the PDF with its own subtopic.
// startPage/endPage are 1-based and inclusive. For a single page, startPage === endPage.
const sectionSchema = new mongoose.Schema({
  subtopic: { type: String, default: '', trim: true },
  startPage: { type: Number, required: true, min: 1 },
  endPage: { type: Number, required: true, min: 1 },
  // Leitner review state — mirrors Card schema
  boxLevel: { type: Number, default: 0, min: 0, max: 2 },
  lastReviewed: { type: Date, default: null },
  weak: { type: Boolean, default: false },
  visitCount: { type: Number, default: 0 },
}, { _id: true });

const pdfNoteSchema = new mongoose.Schema({
  // Global "topic" for the whole PDF — analogous to a deck/flashcard topic.
  topic: { type: String, required: true, trim: true },
  title: { type: String, default: '', trim: true },

  // How the PDF originally arrived. Either way, the bytes live on local disk
  // under /uploads and Mongo only stores metadata + the path.
  sourceType: { type: String, enum: ['file', 'drive'], required: true },
  fileName: { type: String, default: '' },     // stored filename on disk
  fileUrl: { type: String, default: '' },       // served path, e.g. /uploads/<file>
  driveLink: { type: String, default: '' },     // original Drive share link (for refresh re-download)

  sections: { type: [sectionSchema], default: () => [] },
}, { timestamps: true });

pdfNoteSchema.index({ topic: 1 });

export default mongoose.model('PdfNote', pdfNoteSchema);
