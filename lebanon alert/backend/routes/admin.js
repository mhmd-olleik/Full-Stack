const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect, adminOnly } = require('../middleware/auth');
const { sendAlertNotification } = require('../services/notificationService');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// @route   GET /api/admin/pending
// @desc    Get all pending alerts
// @access  Admin
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [alerts, total] = await Promise.all([
      Alert.find({ status: 'pending' })
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reportedBy', 'name email')
        .lean(),
      Alert.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/alerts
// @desc    Create a new alert (admin-verified)
// @access  Admin
router.post('/alerts', async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      source: 'admin',
      status: 'verified',
      verifiedBy: req.user._id,
      verifiedAt: new Date()
    };

    // Ensure title/description are bilingual objects
    if (typeof alertData.title === 'string') {
      alertData.title = { en: alertData.title, ar: '' };
    }
    if (typeof alertData.description === 'string') {
      alertData.description = { en: alertData.description, ar: '' };
    }

    const alert = await Alert.create(alertData);

    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new-alert', alert);
    }

    // Send push notification for high/critical alerts
    if (['high', 'critical'].includes(alert.severity)) {
      await sendAlertNotification(alert);
      alert.notificationSent = true;
      await alert.save();
    }

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/alerts/:id
// @desc    Update an alert
// @access  Admin
router.put('/alerts/:id', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-updated', alert);
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/alerts/:id/verify
// @desc    Verify a pending alert
// @access  Admin
router.put('/alerts/:id/verify', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = 'verified';
    alert.verifiedBy = req.user._id;
    alert.verifiedAt = new Date();
    
    // Allow severity override during verification
    if (req.body.severity) {
      alert.severity = req.body.severity;
    }

    await alert.save();

    // Broadcast new verified alert
    const io = req.app.get('io');
    if (io) {
      io.emit('new-alert', alert);
    }

    // Send push notification for high/critical
    if (['high', 'critical'].includes(alert.severity)) {
      await sendAlertNotification(alert);
      alert.notificationSent = true;
      await alert.save();
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/alerts/:id/reject
// @desc    Reject a pending alert
// @access  Admin
router.put('/alerts/:id/reject', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert, message: 'Alert rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/alerts/:id/severity
// @desc    Override alert severity
// @access  Admin
router.put('/alerts/:id/severity', async (req, res) => {
  try {
    const { severity } = req.body;
    
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ success: false, message: 'Invalid severity level' });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { severity },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('alert-updated', alert);
    }

    // If upgraded to high/critical, send notification
    if (['high', 'critical'].includes(severity) && !alert.notificationSent) {
      await sendAlertNotification(alert);
      alert.notificationSent = true;
      await alert.save();
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/alerts/:id
// @desc    Delete an alert
// @access  Admin
router.delete('/alerts/:id', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('alert-deleted', { id: req.params.id });
    }

    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
