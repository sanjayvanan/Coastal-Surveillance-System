// controllers/notificationController.js
const Notification = require('../model/NotificationSchema');

const getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find();
        res.status(200).json({
            message: 'Notifications retrieved successfully',
            notifications
        });
    } catch (err) {
        console.error('Error retrieving notifications:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

module.exports = {
    getAllNotifications
};