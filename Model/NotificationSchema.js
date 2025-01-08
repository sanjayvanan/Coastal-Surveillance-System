// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    shape_id: { type: String, required: true },
    ship_id: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    alert_type: { type: String, required: true },
    entry_status: { type: String, required: true },
    user_id: { type: String, required: true }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;