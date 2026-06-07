import mongoose from 'mongoose';

const approachSchema = new mongoose.Schema({
  label: { type: String, default: 'Approach', trim: true },
  approach: { type: String, default: '' },
  timeComplexity: { type: String, default: '' },
  spaceComplexity: { type: String, default: '' },
  code: { type: String, default: '' },
}, { _id: false });

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  topic: { type: String, required: true, trim: true },
  subtopic: { type: String, default: '', trim: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  problemLink: { type: String, default: '' },
  question: { type: String, default: '' },
  approaches: { type: [approachSchema], default: () => [] },
  notes: { type: String, default: '' },
  boxLevel: { type: Number, default: 0, min: 0, max: 2 },
  archived: { type: Boolean, default: false },
  lastReviewed: { type: Date, default: null },
  weak: { type: Boolean, default: false },
  visitCount: { type: Number, default: 0 },
}, { timestamps: true });

cardSchema.index({ title: 'text', topic: 'text' });
cardSchema.index({ topic: 1 });
cardSchema.index({ archived: 1, boxLevel: 1, lastReviewed: 1 });

export default mongoose.model('Card', cardSchema);
