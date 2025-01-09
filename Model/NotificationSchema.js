// models/Notification.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    shape_id: { type: String, required: true }
});

const notificationSchema = new mongoose.Schema({
    shape_id: { type: String, required: true },
    ship_id: { type: String, required: true },
    alerts: [alertSchema],
    entry_status: { type: String, required: true },
    user_id: { type: String, required: true },
    comment: { type: String }
}, { timestamps: true });

// Add an index for efficient querying by ship_id
notificationSchema.index({ ship_id: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;