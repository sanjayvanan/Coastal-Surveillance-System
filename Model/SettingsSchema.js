const mongoose= require("mongoose")


// Settings Schema - Update to include preferredLocation section
const SettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'users' },
    general: {
        pastDataHours: { type: Number, default: 24 },
        dataRefresh: { type: Number, default: 5 },
        timezone: { type: Number, default: 0.0 },
        theme: { type: String, default: 'Dark', enum: ['Dark', 'Light'] }
    },
    pastTrail: {
        hours: { type: Number, default: 24 },
        plotSize: { type: String, default: 'Small' }
    },
    viewport: {
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
        zoomLevel: { type: Number, default: 3 }
    },
    preferredLocation: {
        name: { type: String, default: '' },
        WKT: { type: String, default: '' },
        isPreferred : { type: Boolean, default: true }
    },
    tracking: {
        watchlists: {
            type: [{
                name: { type: String, required: true },
                description: { type: String },
                mmsiList: { type: [String], default: [] },
                isActive: { type: Boolean, default: false }
            }],
            default: () => ([
                {
                    name: "Watchlist 1",
                    description: "First watchlist",
                    mmsiList: [],
                    isActive: false
                },
                {
                    name: "Watchlist 2",
                    description: "Second watchlist",
                    mmsiList: [],
                    isActive: false
                },
                {
                    name: "Watchlist 3",
                    description: "Third watchlist",
                    mmsiList: [],
                    isActive: false
                },
                {
                    name: "Watchlist 4",
                    description: "Fourth watchlist",
                    mmsiList: [],
                    isActive: false
                },
                {
                    name: "Watchlist 5",
                    description: "Fifth watchlist",
                    mmsiList: [],
                    isActive: false
                }
            ])
        },
        trackColor: { type: String, default: "#FFFF00" }
    },
    ui: {
        searchBar: {
            x: { type: Number, default: 10 },
            y: { type: Number, default: 10 }
        }
    },
    updatedAt: { type: Date, default: Date.now }
});

const SettingsModel = mongoose.model('settings', SettingsSchema); 

module.exports = SettingsModel