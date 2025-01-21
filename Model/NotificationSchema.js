// models/Notification.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: { type: String, required: true },
    sensor_timestamp: { type: Number, required: true },
    shape_id: { type: String, required: true },
    description: { type: String, required: true }
});

const incidentSchema = new mongoose.Schema({
    ship_id: { type: String, required: true },
    alerts: [alertSchema],
    entry_status: { type: String, required: true },
    acknowledged: { type: Boolean, default: false },
    current: { type: Boolean, default: false },
    user_id: { type: String, required: true, default: 'admin' },
    comment: { type: String, default: 'Work in progress' },
    createdAt: { type: Number },
    updatedAt: { type: Number }
});

// Remove automatic timestamps
incidentSchema.set('timestamps', false);

// Add an index for efficient querying by ship_id
incidentSchema.index({ ship_id: 1, 'alerts.shape_id': 1, current: 1 });

const Notification = mongoose.model('Notification', incidentSchema);

module.exports = Notification;


