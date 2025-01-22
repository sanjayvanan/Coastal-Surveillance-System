const express = require('express');
const router = express.Router();
const RouteController = require('../Controller/RouteController');

// Create a new route
router.post('/', RouteController.createRoute);

// Get all routes
router.get('/', RouteController.getUserRoutes);

// Delete a route
router.delete('/:routeId', RouteController.deleteRoute);

// Update a route
router.put('/:routeId', RouteController.updateRoute);

module.exports = router;