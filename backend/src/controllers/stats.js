import Card from '../models/Card.js';

// Leitner box thresholds (days) before a card is due again. Mirrors getDueCards.
const BOX_THRESHOLD_DAYS = { 0: 0, 1: 3, 2: 7 };
const MS_PER_DAY = 86_400_000;

export const getStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Legacy cards may have a missing boxLevel — treat that as box 0 (always due).
    const boxMatch = (box) => (box === 0 ? { boxLevel: { $in: [0, null] } } : { boxLevel: box });
    const dueOrClauses = Object.entries(BOX_THRESHOLD_DAYS).map(([box, days]) => {
      const cutoff = new Date(now.getTime() - days * MS_PER_DAY);
      return days === 0
        ? boxMatch(Number(box))
        : { ...boxMatch(Number(box)), $or: [{ lastReviewed: null }, { lastReviewed: { $lte: cutoff } }] };
    });

    const [total, dueToday, reviewedToday, topicDist] = await Promise.all([
      Card.countDocuments(),
      Card.countDocuments({ archived: { $ne: true }, $or: dueOrClauses }),
      Card.countDocuments({ lastReviewed: { $gte: todayStart, $lt: todayEnd } }),
      Card.aggregate([
        { $group: { _id: '$topic', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      total,
      dueToday,
      reviewedToday,
      topicDistribution: topicDist.map((t) => ({ topic: t._id, count: t.count })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
