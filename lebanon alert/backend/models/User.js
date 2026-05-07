const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  fcmTokens: [{
    token: String,
    platform: { type: String, enum: ['web', 'android', 'ios'] },
    addedAt: { type: Date, default: Date.now }
  }],
  preferredRegions: [{
    type: String,
    enum: ['Beirut', 'South Lebanon', 'Bekaa', 'North Lebanon', 'Mount Lebanon', 'Nabatieh', 'Baalbek-Hermel', 'Akkar', 'Nationwide']
  }],
  language: {
    type: String,
    enum: ['en', 'ar'],
    default: 'en'
  },
  notificationSettings: {
    enabled: { type: Boolean, default: true },
    minSeverity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    sound: { type: Boolean, default: true },
    vibration: { type: Boolean, default: true }
  },
  lastLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
