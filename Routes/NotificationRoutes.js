// routes/notificationRoutes.js
const express = require('express');
const { 
    getAllNotifications, 
    addOrUpdateNotification,
    getNotificationsByShipId
} = require('../controller/NotificationController');

const router = express.Router();

router.get('/notifications', getAllNotifications);
router.post('/notifications', addOrUpdateNotification);
router.get('/notifications/ship/:ship_id', getNotificationsByShipId);

module.exports = router;