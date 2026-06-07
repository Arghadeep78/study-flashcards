import Card from '../models/Card.js';

export const getStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [total, dueToday, reviewedToday, topicDist] = await Promise.all([
      Card.countDocuments(),
      Card.countDocuments({ nextReview: { $lte: now } }),
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
