import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsa-flashcards';

const sectionSchema = new mongoose.Schema({
  subtopic: { type: String, default: '', trim: true },
  startPage: { type: Number, required: true },
  endPage: { type: Number, required: true },
  boxLevel: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
  lastReviewed: { type: Date, default: null },
  weak: { type: Boolean, default: false },
  visitCount: { type: Number, default: 0 },
});

const PdfNote = mongoose.model('PdfNote', new mongoose.Schema({
  topic: String,
  title: String,
  sections: [sectionSchema],
}));

async function main() {
  await mongoose.connect(mongoUri);
  const notes = await PdfNote.find().lean();
  console.log(JSON.stringify(notes, null, 2));
  await mongoose.disconnect();
}

main().catch(console.error);
