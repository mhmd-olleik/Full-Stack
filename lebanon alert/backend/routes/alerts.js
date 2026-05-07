const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

// @route   GET /api/alerts
// @desc    Get all verified alerts with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      region,
      severity,
      category,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-createdAt',
      search
    } = req.query;

    const query = { status: status || 'verified' };

    if (region) query.region = region;
    if (severity) query.severity = severity;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ar': { $regex: search, $options: 'i' } },
        { 'description.en': { $regex: search, $options: 'i' } },
        { 'description.ar': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reportedBy', 'name')
        .populate('verifiedBy', 'name')
        .lean(),
      Alert.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/alerts/stats
// @desc    Get alert statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await Alert.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/alerts/map
// @desc    Get alerts with location data for map display
// @access  Public
router.get('/map', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const alerts = await Alert.find({
      status: 'verified',
      'location.lat': { $exists: true, $ne: null },
      'location.lng': { $exists: true, $ne: null },
      createdAt: { $gte: since }
    })
    .select('title severity category region location createdAt')
    .sort('-createdAt')
    .limit(200)
    .lean();

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/alerts/regions
// @desc    Get alert counts grouped by region (for heat map)
// @access  Public
router.get('/regions', async (req, res) => {
  try {
    const regionStats = await Alert.aggregate([
      { $match: { status: 'verified' } },
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          latest: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, data: regionStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get single alert by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('reportedBy', 'name')
      .populate('verifiedBy', 'name');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/alerts/report
// @desc    User submits an alert report
// @access  Private
router.post('/report', protect, async (req, res) => {
  try {
    const { title, description, category, region, location, severity } = req.body;

    const alert = await Alert.create({
      title: typeof title === 'string' ? { en: title, ar: '' } : title,
      description: typeof description === 'string' ? { en: description, ar: '' } : description,
      category: category || 'other',
      region,
      location,
      severity: severity || 'medium',
      source: 'user_report',
      status: 'pending',
      reportedBy: req.user._id
    });

    // Notify admins via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('new-report', {
        alert,
        reportedBy: { name: req.user.name, email: req.user.email }
      });
    }

    res.status(201).json({ success: true, data: alert, message: 'Alert reported. Pending admin verification.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
