const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    ar: { type: String, default: '' }
  },
  description: {
    en: { type: String, required: true },
    ar: { type: String, default: '' }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    enum: ['airstrike', 'drone', 'siren', 'shelling', 'rocket', 'explosion', 'news', 'humanitarian', 'other'],
    default: 'other',
    index: true
  },
  region: {
    type: String,
    enum: ['Beirut', 'South Lebanon', 'Bekaa', 'North Lebanon', 'Mount Lebanon', 'Nabatieh', 'Baalbek-Hermel', 'Akkar', 'Nationwide'],
    required: true,
    index: true
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: {
      en: { type: String, default: '' },
      ar: { type: String, default: '' }
    }
  },
  source: {
    type: String,
    enum: ['telegram', 'admin', 'user_report', 'reliefweb', 'rss', 'manual'],
    default: 'manual'
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  media: [{
    type: { type: String, enum: ['image', 'video', 'audio'] },
    url: String
  }],
  tags: [String],
  expiresAt: {
    type: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for common queries
alertSchema.index({ createdAt: -1 });
alertSchema.index({ severity: 1, region: 1 });
alertSchema.index({ status: 1, createdAt: -1 });

// Virtual for checking if alert is active
alertSchema.virtual('isActive').get(function() {
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return this.status === 'verified';
});

// Static method to get alert stats
alertSchema.statics.getStats = async function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, todayCount, weekCount, bySeverity, byRegion, byCategory] = await Promise.all([
    this.countDocuments({ status: 'verified' }),
    this.countDocuments({ status: 'verified', createdAt: { $gte: today } }),
    this.countDocuments({ status: 'verified', createdAt: { $gte: weekAgo } }),
    this.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$region', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
  ]);

  return {
    total,
    today: todayCount,
    thisWeek: weekCount,
    pending: await this.countDocuments({ status: 'pending' }),
    bySeverity: bySeverity.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    byRegion: byRegion.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    byCategory: byCategory.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {})
  };
};

module.exports = mongoose.model('Alert', alertSchema);
