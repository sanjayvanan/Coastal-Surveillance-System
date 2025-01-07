const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')

const SettingsModel = require('../Model/SettingsSchema');


// Save settings endpoint
const SaveSettings = async (req, res) => {
    try {
        const { userId, settings } = req.body;
        
        console.log('Received request body:', JSON.stringify(req.body, null, 2));

        if (!userId || !settings) {
            return res.status(400).json({
                success: false,
                message: 'UserId and settings are required'
            });
        }

        // Validate settings structure
        if (!settings.general) {
            return res.status(400).json({
                success: false,
                message: 'Invalid settings structure. General section is required.'
            });
        }

        // Format the settings data with safe parsing
        const formattedSettings = {
            general: {
                pastDataHours: parseInt(settings.general.pastDataHours) || 24,
                dataRefresh: parseInt(settings.general.dataRefresh) || 5,
                theme: settings.general.theme || 'Dark',
                timezone: parseFloat(settings.general.timezone) || 0.0
            },
            pastTrail: {
                hours: parseInt(settings.pastTrail.hours) || 24,
                plotSize: settings.pastTrail.plotSize || "Small"
            },
            tracking: {
                mmsiList: Array.isArray(settings.tracking?.mmsiList) 
                    ? settings.tracking.mmsiList 
                    : [],
                trackColor: settings.tracking?.trackColor || "#FFFF00",
                watchlists: Array.isArray(settings.tracking?.watchlists)
                    ? settings.tracking.watchlists
                    : []
            },
            ui: {
                searchBar: settings.ui?.searchBar || { x: 10, y: 10 }
            }
        };

        // Update or create settings
        const updatedSettings = await SettingsModel.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { 
                $set: {
                    ...formattedSettings,
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Settings saved successfully',
            settings: updatedSettings
        });

    } catch (err) {
        console.error('Save settings error:', err);
        console.error('Request body:', req.body);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

// Save preferred location endpoint
const SavePreferredLocation = async (req, res) => {
    try {
        const { userId, preferredLocation } = req.body;
        console.log('Received viewport and theme update:', {
            userId,
            preferredLocation
        });
        if (!userId || !preferredLocation) {
            return res.status(400).json({
                success: false,
                message: 'UserId and preferredLocation are required'
            });
        }

        // Update settings
        const updatedSettings = await SettingsModel.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { 
                $set: {
                    preferredLocation: {
                        name: preferredLocation.name,
                        WKT: preferredLocation.WKT,
                        isPreferred : preferredLocation.isPreferred
                    },
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Preferred location saved successfully',
            settings: updatedSettings
        });

    } catch (err) {
        console.error('Save preferred location error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
} 

// Add the new endpoints
const SaveViewportAndTheme = async (req, res) => {
    try {
        const { userId, viewport, isDarkTheme } = req.body;

        console.log('Received viewport and theme update:', {
            userId,
            viewport,
            isDarkTheme
        });

        if (!userId || !viewport) {
            return res.status(400).json({
                success: false,
                message: 'UserId and viewport data are required'
            });
        }

        // Validate viewport data
        if (viewport.latitude === undefined || 
            viewport.longitude === undefined || 
            viewport.zoomLevel === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Invalid viewport data'
            });
        }

        // Format the viewport data with safe parsing
        const formattedViewport = {
            latitude: parseFloat(viewport.latitude) || 0,
            longitude: parseFloat(viewport.longitude) || 0,
            zoomLevel: parseInt(viewport.zoomLevel) || 3
        };

        // Validate coordinate ranges
        if (formattedViewport.latitude < -90 || formattedViewport.latitude > 90 ||
            formattedViewport.longitude < -180 || formattedViewport.longitude > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates'
            });
        }

        // Update settings
        const updatedSettings = await SettingsModel.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { 
                $set: {
                    viewport: formattedViewport,
                    'general.theme': isDarkTheme ? 'Dark' : 'Light',
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Viewport and theme settings saved successfully',
            settings: updatedSettings
        });

    } catch (err) {
        console.error('Save viewport and theme error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

// Endpoint to get viewport and theme
const GetViewportAndTheme = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'UserId is required'
            });
        }

        const settings = await SettingsModel.findOne({ 
            userId: new mongoose.Types.ObjectId(userId) 
        });

        if (!settings) {
            // Return default values if no settings found
            return res.json({
                success: true,
                viewport: {
                    latitude: 0,
                    longitude: 0,
                    zoomLevel: 3
                },
                preferredLocation:
                {
                    name : "Not Set",
                    WKT : "",
                    isPreferred : false 
                },
                isDarkTheme: true
            });
        }

        res.json({
            success: true,
            viewport: settings.viewport,
            preferredLocation: settings.preferredLocation,
            isDarkTheme: settings.general.theme === 'Dark'
        });

    } catch (err) {
        console.error('Get viewport and theme error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

//getSettings
const GetSettings = async (req, res) => {
    try {
        console.log('Received request for settings');
        console.log('UserId:', req.params.userId);
        console.log('Auth header:', req.headers.authorization);

        const userId = req.params.userId;

        if (!userId) {
            console.log('No userId provided');
            return res.status(400).json({
                success: false,
                message: 'UserId is required'
            });
        }

        console.log('Looking for settings with userId:', userId);
        const settings = await SettingsModel.findOne({ 
            userId: new mongoose.Types.ObjectId(userId) 
        });

        console.log('Found settings:', settings);

        if (!settings) {
            console.log('No settings found');
            return res.status(404).json({
                success: false,
                message: 'Settings not found for this user'
            });
        }

        console.log('Sending settings response');
        res.json({
            success: true,
            message: 'Settings retrieved successfully',
            settings: settings
        });

    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            
            error: err.message
        });
    }
}

// Save UI Position (integrates with existing saveSettings endpoint)
const SaveUIPosition = async (req, res) => {
    try {
        const { userId, x, y } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'UserId is required'
            });
        }

        // Update only the UI position
        const result = await SettingsModel.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { 
                $set: {
                    'ui.searchBar.x': x,
                    'ui.searchBar.y': y,
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'UI position saved successfully',
            position: result.ui.searchBar
        });

    } catch (err) {
        console.error('Save UI position error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

// Get UI Position (separate from getSettings for efficiency)
const GetUIPosition = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'UserId is required'
            });
        }

        const settings = await SettingsModel.findOne(
            { userId: new mongoose.Types.ObjectId(userId) },
            { 'ui.searchBar': 1 }
        );

        const position = settings?.ui?.searchBar || { x: 10, y: 10 };

        res.json({
            success: true,
            position: position
        });

    } catch (err) {
        console.error('Get UI position error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}


module.exports = {SaveSettings,SavePreferredLocation,SaveViewportAndTheme,GetViewportAndTheme, GetSettings, SaveUIPosition, GetUIPosition}