const Route = require('../Model/RouteSchema');

const RouteController = {
    // Create a new route
    createRoute: async (req, res) => {
        try {
            console.log('Request body:', req.body); // Debug log
            const { name, points, totalDistance } = req.body;

            // Create route without userId
            const newRoute = new Route({
                name,
                points,
                totalDistance
                // userId is optional now, so we don't need to set it
            });

            const savedRoute = await newRoute.save();
            console.log('Saved route:', savedRoute); // Debug log
            res.status(201).json(savedRoute);
        } catch (error) {
            console.error('Error creating route:', error);
            res.status(500).json({ message: 'Error creating route', error: error.message });
        }
    },

    // Get all routes
    getUserRoutes: async (req, res) => {
        try {
            const routes = await Route.find().sort({ createdAt: -1 });
            res.status(200).json(routes);
        } catch (error) {
            console.error('Error fetching routes:', error);
            res.status(500).json({ message: 'Error fetching routes', error: error.message });
        }
    },

    // Get a single route by ID
    getRouteById: async (req, res) => {
        try {
            const { routeId } = req.params;
            const route = await Route.findById(routeId);

            if (!route) {
                return res.status(404).json({ message: 'Route not found' });
            }

            res.status(200).json(route);
        } catch (error) {
            console.error('Error fetching route:', error);
            res.status(500).json({ message: 'Error fetching route', error: error.message });
        }
    },

    // Delete a route
    deleteRoute: async (req, res) => {
        try {
            const { routeId } = req.params;

            const deletedRoute = await Route.findByIdAndDelete(routeId);

            if (!deletedRoute) {
                return res.status(404).json({ message: 'Route not found' });
            }

            res.status(200).json({ message: 'Route deleted successfully' });
        } catch (error) {
            console.error('Error deleting route:', error);
            res.status(500).json({ message: 'Error deleting route', error: error.message });
        }
    },

    // Delete all routes
    deleteAllRoutes: async (req, res) => {
        try {
            await Route.deleteMany(); // Delete all routes
            res.status(200).json({ message: 'All routes deleted successfully' });
        } catch (error) {
            console.error('Error deleting routes:', error);
            res.status(500).json({ message: 'Error deleting routes', error: error.message });
        }
    },

    // Update a route
    updateRoute: async (req, res) => {
        try {
            const { routeId } = req.params;
            const { name, points, totalDistance } = req.body;

            const updatedRoute = await Route.findByIdAndUpdate(
                routeId,
                { name, points, totalDistance },
                { new: true }
            );

            if (!updatedRoute) {
                return res.status(404).json({ message: 'Route not found' });
            }

            res.status(200).json(updatedRoute);
        } catch (error) {
            console.error('Error updating route:', error);
            res.status(500).json({ message: 'Error updating route', error: error.message });
        }
    }
};

module.exports = RouteController;