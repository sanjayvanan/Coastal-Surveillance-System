// models/Notification.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: { type: String, required: true },
    sensor_timestamp: { type: Number, required: true },
    shape_id: { type: String, required: true },
    polygon_name: { type: String, required: true,default:'noneDude' },
    entry_status: { type: String, required: true },
    current: { type: Boolean, default: false },
    user_id: { type: String, required: true, default: 'admin' },
    acknowledged: { type: Boolean, default: false },
    ACK_time: { type: Number,default:0 },
    description: { type: String, required: true }
});

const incidentSchema = new mongoose.Schema({
    ship_id: { type: String, required: true },
    alerts: [alertSchema],
    createdAt: { type: Number },
    updatedAt: { type: Number }
});

// Remove automatic timestamps
incidentSchema.set('timestamps', false);

// Add indexes for efficient querying
incidentSchema.index({ ship_id: 1 });
incidentSchema.index({ 'alerts.shape_id': 1 });
incidentSchema.index({ 'alerts.current': 1 });

const Notification = mongoose.model('Notification', incidentSchema);

module.exports = Notification;


