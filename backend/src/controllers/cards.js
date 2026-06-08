import Card from '../models/Card.js';

// Migrate cards that still use the old brute/better/optimal fixed fields
function migrateApproaches(card) {
  const { brute, better, optimal, approaches, ...rest } = card;
  const hasLegacy = brute || better || optimal;
  if (!hasLegacy) return { ...rest, approaches: approaches ?? [] };

  const migrated = [];
  const legacy = [['Brute Force', brute], ['Better', better], ['Optimal', optimal]];
  for (const [label, a] of legacy) {
    if (a && (a.approach || a.code || a.timeComplexity || a.spaceComplexity)) {
      migrated.push({ label, ...a });
    }
  }
  return { ...rest, approaches: [...migrated, ...(approaches ?? [])] };
}

export const getCards = async (req, res) => {
  try {
    const { search, topic, subtopic, difficulty, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
      ];
    }
    if (topic) query.topic = { $in: topic.split(',') };
    if (subtopic) query.subtopic = { $in: subtopic.split(',') };
    if (difficulty) query.difficulty = difficulty;

    const skip = (Number(page) - 1) * Number(limit);
    const [cards, total] = await Promise.all([
      Card.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Card.countDocuments(query),
    ]);

    res.json({ cards, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCard = async (req, res) => {
  try {
    const card = await Card.create(req.body);
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateCard = async (req, res) => {
  try {
    const body = migrateApproaches(req.body);
    const card = await Card.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const duplicateCard = async (req, res) => {
  try {
    const original = await Card.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Card not found' });

    const { _id, createdAt, updatedAt, ...rest } = original.toObject();
    const data = migrateApproaches(rest);
    data.title = `${data.title} (Copy)`;
    data.boxLevel = 0;
    data.archived = false;
    data.lastReviewed = null;

    const copy = await Card.create(data);
    res.status(201).json(copy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deadline-driven Leitner box system.
// Boxes 0..3; "due" once enough days have elapsed since the last review.
const FINAL_BOX = 3;
const BOX_THRESHOLD_DAYS = { 0: 0, 1: 3, 2: 7, 3: 12 };
const MS_PER_DAY = 86_400_000;

export const reviewCard = async (req, res) => {
  try {
    const { rating } = req.body; // 'pass' (Correct) | 'fail' (Missed)
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const passed = rating === 'pass';
    const update = { lastReviewed: new Date(), $inc: { visitCount: 1 } };

    if (!passed) {
      update.boxLevel = 0;
    } else if (card.boxLevel < FINAL_BOX) {
      update.boxLevel = card.boxLevel + 1;
    }
    // Correct on box 3 — stays in box 3, resets the 12-day timer via lastReviewed

    const updated = await Card.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDueCards = async (req, res) => {
  try {
    const now = Date.now();

    // A card is due when its box threshold has elapsed since lastReviewed.
    // Box 0 (threshold 0) is always due; unseen cards (lastReviewed: null) are due in any box.
    // Legacy cards may have a missing boxLevel — treat that as box 0 (always due).
    const boxMatch = (box) => (box === 0 ? { boxLevel: { $in: [0, null] } } : { boxLevel: box });
    const orClauses = Object.entries(BOX_THRESHOLD_DAYS).map(([box, days]) => {
      const cutoff = new Date(now - days * MS_PER_DAY);
      return days === 0
        ? boxMatch(Number(box))
        : { ...boxMatch(Number(box)), $or: [{ lastReviewed: null }, { lastReviewed: { $lte: cutoff } }] };
    });

    const cards = await Card.find({ archived: { $ne: true }, $or: orClauses })
      .sort({ boxLevel: 1, lastReviewed: 1 })
      .lean();

    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTopics = async (req, res) => {
  try {
    const agg = await Card.aggregate([
      { $group: { _id: '$topic', subtopics: { $addToSet: '$subtopic' } } },
      { $sort: { _id: 1 } },
    ]);
    const topics = agg.map((t) => ({
      topic: t._id,
      subtopics: t.subtopics.filter(Boolean).sort(),
    }));
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Weighted sampling without replacement. Final weight combines four factors:
//   recencyWeight  = 1 - e^(-daysSinceLastReview / HALF_LIFE)   [never-reviewed → 1.0]
//   scarcityWeight = 1 / (visitCount + 1)                        [unseen → 1.0]
//   boxWeight      = (FINAL_BOX + 1 - boxLevel) / (FINAL_BOX + 1) [box 0 → 1.0, box 3 → 0.25]
//   subtopicWeight = 1 / (subtopicPicksSoFar + 1)               [dynamic: penalises subtopics already picked]
// finalWeight = recencyWeight * scarcityWeight * boxWeight * subtopicWeight
// subtopicWeight is recomputed each round so picking one item immediately deprioritises
// remaining items from the same subtopic.
const HALF_LIFE = 7;

function weightedSample(pool, count) {
  if (pool.length <= count) return pool;
  const now = Date.now();

  // Base weights — static per item (recency × scarcity × box)
  const baseWeights = pool.map((c) => {
    const scarcityWeight = 1 / ((c.visitCount ?? 0) + 1);
    const recencyWeight = c.lastReviewed
      ? 1 - Math.exp(-((now - new Date(c.lastReviewed).getTime()) / 86_400_000) / HALF_LIFE)
      : 1;
    const boxWeight = (FINAL_BOX + 1 - (c.boxLevel ?? 0)) / (FINAL_BOX + 1);
    return recencyWeight * scarcityWeight * boxWeight;
  });

  const selected = [];
  const available = [...pool.keys()];
  const base = [...baseWeights];
  const subtopicPicks = {}; // tracks how many items from each subtopic have been picked

  for (let i = 0; i < count && available.length > 0; i++) {
    // Effective weight = base × subtopic novelty (recomputed each round)
    const effective = available.map((poolIdx, j) => {
      const sub = pool[poolIdx].subtopic || '';
      return base[j] * (1 / ((subtopicPicks[sub] ?? 0) + 1));
    });

    const total = effective.reduce((s, x) => s + x, 0);
    let r = Math.random() * total;
    let picked = available.length - 1;
    for (let j = 0; j < available.length; j++) {
      r -= effective[j];
      if (r <= 0) { picked = j; break; }
    }

    const pickedItem = pool[available[picked]];
    selected.push(pickedItem);
    const sub = pickedItem.subtopic || '';
    subtopicPicks[sub] = (subtopicPicks[sub] ?? 0) + 1;
    available.splice(picked, 1);
    base.splice(picked, 1);
  }

  return selected;
}

export const getRandomCards = async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 10, 100);
    const pool = await Card.aggregate([{ $sample: { size: count * 5 } }]);
    res.json(weightedSample(pool, count));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSelectiveCards = async (req, res) => {
  try {
    const { topics, subtopics, count } = req.body;
    const match = {};
    if (topics?.length) match.topic = { $in: topics };
    if (subtopics?.length) match.subtopic = { $in: subtopics };

    const wantAll = !count || parseInt(count) === 0;
    const limit = wantAll ? null : Math.min(parseInt(count), 2000);

    // Pattern-focused pool: unseen cards first, then longest-unseen — so the
    // sampler operates on the newest/lesser-seen cards within the selected pattern.
    const pipeline = [
      { $match: match },
      { $addFields: { isUnseen: { $cond: [{ $eq: ['$visitCount', 0] }, 1, 0] } } },
      { $sort: { isUnseen: -1, lastReviewed: 1 } },
    ];
    // fetch a larger pool so weighting has room to work; for "All" take everything
    if (limit) pipeline.push({ $limit: limit * 5 });
    pipeline.push({ $unset: 'isUnseen' }); // drop the temporary sort field before returning
    const pool = await Card.aggregate(pipeline);

    res.json(weightedSample(pool, limit ?? pool.length));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getWeakCards = async (req, res) => {
  try {
    // sort by boxLevel asc — least-mastered first, then by lastReviewed asc for untouched cards
    const cards = await Card.find({ weak: true }).sort({ boxLevel: 1, lastReviewed: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleWeak = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    card.weak = !card.weak;
    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const importCards = async (req, res) => {
  try {
    const { cards } = req.body;
    if (!Array.isArray(cards)) return res.status(400).json({ error: 'Expected cards array' });

    const cleaned = cards.map(({ _id, createdAt, updatedAt, __v, ...rest }) => migrateApproaches(rest));
    const inserted = await Card.insertMany(cleaned, { ordered: false });
    res.status(201).json({ imported: inserted.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const exportCards = async (req, res) => {
  try {
    const cards = await Card.find({}).lean();
    res.json({ cards, exportedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
