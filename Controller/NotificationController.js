// controllers/notificationController.js
const Notification = require('../model/NotificationSchema');

const getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ 'alerts.timestamp': -1 }); // Sort by most recent alert
        res.status(200).json({
            message: 'Notifications retrieved successfully',
            notifications
        });
    } catch (err) {
        console.error('Error retrieving notifications:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const addOrUpdateNotification = async (req, res) => {
    try {
        const { shape_id, ship_id, alert_type, entry_status, user_id, comment } = req.body;

        // Find existing notification for this ship
        let notification = await Notification.findOne({ ship_id });

        if (notification) {
            // Add new alert to existing notification
            notification.alerts.push({
                type: alert_type,
                timestamp: new Date(),
                comment: comment || ''
            });
            
            // Update status
            notification.entry_status = entry_status;
            
            await notification.save();
        } else {
            // Create new notification
            notification = new Notification({
                shape_id,
                ship_id,
                alerts: [{
                    type: alert_type,
                    timestamp: new Date(),
                    comment: comment || ''
                }],
                entry_status,
                user_id
            });
            
            await notification.save();
        }

        res.status(200).json({
            message: 'Notification updated successfully',
            notification
        });
    } catch (err) {
        console.error('Error updating notification:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const getNotificationsByShipId = async (req, res) => {
    try {
        const { ship_id } = req.params;
        const notification = await Notification.findOne({ ship_id });
        
        if (!notification) {
            return res.status(404).json({ message: 'No notifications found for this ship' });
        }

        res.status(200).json({
            message: 'Notifications retrieved successfully',
            notification
        });
    } catch (err) {
        console.error('Error retrieving notifications:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const acknowledgeNotification = async (req, res) => {
    try {
        const { id } = req.params; // Get the notification UUID from the request parameters
        const { alertId } = req.body; // Get the alert ObjectId from the request body

        // Find the notification by UUID and update the acknowledged field and ACK_time of the specific alert
        const notification = await Notification.findOneAndUpdate(
            { ship_id: id, 'alerts._id': alertId }, // Match notification by ship_id and specific alert by ObjectId
            { 
                $set: { 
                    'alerts.$.acknowledged': true, // Set acknowledged to true
                    'alerts.$.ACK_time': Date.now() // Set ACK_time to current timestamp
                } 
            }, 
            { new: true } // Return the updated document
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification or alert not found' });
        }

        res.status(200).json({
            message: 'Alert acknowledged successfully',
            notification
        });
    } catch (err) {
        console.error('Error acknowledging alert:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

module.exports = {
    getAllNotifications,
    addOrUpdateNotification,
    getNotificationsByShipId,
    acknowledgeNotification
};