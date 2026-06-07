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
  nextReview: { type: Date, default: () => new Date() },
  lastReviewed: { type: Date, default: null },
  reviewCount: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 1 },
  weak: { type: Boolean, default: false },
  visitCount: { type: Number, default: 0 },
}, { timestamps: true });

cardSchema.index({ title: 'text', topic: 'text' });
cardSchema.index({ topic: 1 });
cardSchema.index({ nextReview: 1 });

export default mongoose.model('Card', cardSchema);
