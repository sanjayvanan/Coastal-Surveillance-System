const express = require('express');
const router = express.Router();
const RouteController = require('../Controller/RouteController');

// Create a new route
router.post('/', RouteController.createRoute);

// Get all routes
router.get('/', RouteController.getUserRoutes);

// Get a single route by ID
router.get('/:routeId', RouteController.getRouteById);

// Delete a route
router.delete('/:routeId', RouteController.deleteRoute);

// Delete all routes (new endpoint)
router.delete('/', RouteController.deleteAllRoutes);

// Update a route
router.put('/:routeId', RouteController.updateRoute);

module.exports = router;