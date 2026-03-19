const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  remoteUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  connectionType: {
    type: String,
    enum: ['direct', 'bound'],
    default: 'direct'
  },
  status: {
    type: String,
    enum: ['connecting', 'connected', 'disconnected', 'error'],
    default: 'connecting'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  quality: {
    resolution: String,
    fps: Number,
    latency: Number
  },
  dataTransferred: {
    type: Number,
    default: 0 // bytes
  },
  error: {
    type: String,
    default: null
  }
});

// 索引
connectionSchema.index({ deviceId: 1 });
connectionSchema.index({ userId: 1 });
connectionSchema.index({ status: 1 });
connectionSchema.index({ startTime: -1 });

module.exports = mongoose.model('Connection', connectionSchema);
