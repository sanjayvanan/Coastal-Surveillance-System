// routes/notificationRoutes.js
const express = require('express');
const { getAllNotifications } = require('../controller/NotificationController');

const router = express.Router();

router.get('/notifications', getAllNotifications);

module.exports = router;