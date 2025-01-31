// routes/notificationRoutes.js
const express = require('express');
const { 
    getAllNotifications, 
    addOrUpdateNotification,
    getNotificationsByShipId,
    acknowledgeNotification
} = require('../controller/NotificationController');

const router = express.Router();

router.get('/notifications', getAllNotifications);
router.post('/notifications', addOrUpdateNotification);
router.get('/notifications/ship/:ship_id', getNotificationsByShipId);
router.patch('/notifications/:id/acknowledge', acknowledgeNotification);

module.exports = router;