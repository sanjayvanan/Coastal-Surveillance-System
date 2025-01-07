const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')

const SettingsModel = require('../Model/SettingsSchema');

// Add UUID endpoint
const AddUUIDToWatchlist = async (req, res) => {
    try {
        const { userId, uuid, watchlistName } = req.body;

        if (!userId || !uuid || !watchlistName) {
            return res.status(400).json({
                success: false,
                message: 'UserId, UUID, and Watchlist name are required'
            });
        }

        // Find user settings and the specific watchlist
        const settings = await SettingsModel.findOne({ 
            userId: new mongoose.Types.ObjectId(userId) 
        });

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Settings not found for this user'
            });
        }

        const watchlist = settings.tracking.watchlists.find(wl => wl.name === watchlistName);

        if (!watchlist) {
            return res.status(404).json({
                success: false,
                message: 'Watchlist not found'
            });
        }

        // Check if UUID already exists in the watchlist
        if (watchlist.mmsiList.includes(uuid)) {
            return res.status(400).json({
                success: false,
                message: 'UUID already exists in the watchlist'
            });
        }

        // Add new UUID to the watchlist
        watchlist.mmsiList.push(uuid);
        settings.updatedAt = new Date();
        await settings.save();

        res.json({
            success: true,
            message: 'UUID added successfully',
            watchlist: watchlist
        });

    } catch (err) {
        console.error('Add UUID error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
} 

//delete mmsi from tracking
// Delete MMSI endpoint
const DeleteMMSI = async (req, res) => {
    try {
        const { userId, mmsiId } = req.params;

        if (!userId || !mmsiId) {
            return res.status(400).json({
                success: false,
                message: 'UserId and mmsiId are required'
            });
        }

        // Find user settings
        const settings = await SettingsModel.findOne({ 
            userId: new mongoose.Types.ObjectId(userId) 
        });

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Settings not found for this user'
            });
        }

        // Remove MMSI from the list
        const mmsiIndex = settings.tracking.mmsiList.indexOf(mmsiId);
        if (mmsiIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'MMSI not found in the list'
            });
        }

        settings.tracking.mmsiList.splice(mmsiIndex, 1);
        settings.updatedAt = new Date();
        await settings.save();

        console.log(`MMSI ${mmsiId} deleted for user ${userId}`);

        res.json({
            success: true,
            message: 'MMSI deleted successfully',
            mmsiList: settings.tracking.mmsiList
        });

    } catch (err) {
        console.error('Delete MMSI error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}    

//delete mmsi from watchlist
// Delete MMSI from watchlist endpoint
const DeleteMMSIFromWatchlist = async (req, res) => {
    try {
        const userId = req.params.userId;
        const watchlistName = decodeURIComponent(req.params.watchlistName);
        const mmsiId = req.params.mmsiId;

        console.log('Deleting MMSI from watchlist:', { userId, watchlistName, mmsiId });

        if (!userId || !watchlistName || !mmsiId) {
            return res.status(400).json({
                success: false,
                message: 'UserId, watchlist name, and mmsiId are required'
            });
        }

        const settings = await SettingsModel.findOne({ 
            userId: new mongoose.Types.ObjectId(userId) 
        });

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Settings not found for this user'
            });
        }

        // Find the watchlist
        const watchlist = settings.tracking.watchlists.find(w => w.name === watchlistName);
        if (!watchlist) {
            return res.status(404).json({
                success: false,
                message: 'Watchlist not found'
            });
        }

        // Find and remove the MMSI
        const mmsiIndex = watchlist.mmsiList.indexOf(mmsiId);
        if (mmsiIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'MMSI not found in watchlist'
            });
        }

        watchlist.mmsiList.splice(mmsiIndex, 1);
        await settings.save();

        console.log('MMSI deleted from watchlist successfully');

        res.json({
            success: true,
            message: 'MMSI deleted from watchlist successfully',
            watchlist: watchlist
        });

    } catch (err) {
        console.error('Delete MMSI from watchlist error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

//get watchlist
// Get Watchlists endpoint
const GetWatchLists = async (req, res) => {
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
            return res.status(404).json({
                success: false,
                message: 'Settings not found for this user'
            });
        }

        res.json({
            success: true,
            watchlists: settings.tracking.watchlists
        });

    } catch (err) {
        console.error('Get watchlists error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}


module.exports = {AddUUIDToWatchlist, DeleteMMSI, DeleteMMSIFromWatchlist, GetWatchLists}