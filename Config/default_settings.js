// defaultSettings.js
module.exports = {
    general: {
        pastDataHours: 24,
        dataRefresh: 5,
        timezone: 0.0,
        theme: 'Dark'
    },
    CanvasConfig: {
        canvasVPLatLon: "",
        canvasVPScale: 1,
        canvasVPRotation: 0,
        canvasInitialdBIndex: 0,
        canvasbFollow: 0,
        ActiveChartGroup: 0,
        canvasQuilt: 0,
        canvasShowGrid: 1,
        canvasShowOutlines: 1,
        canvasShowDepthUnits: 0,
        canvasShowAIS: 1,
        canvasAttenAIS: 0,
        canvasShowTides: 0,
        canvasShowCurrents: 0,
        canvasShowENCText: 1,
        canvasENCDisplayCategory: 77,
        canvasENCShowDepths: 1,
        canvasENCShowBuoyLabels: 1,
        canvasENCShowLightDescriptions: 1,
        canvasENCShowLights: 1,
        canvasENCShowVisibleSectorLights: 0,
        canvasENCShowAnchorInfo: 0,
        canvasENCShowDataQuality: 0,
        canvasCourseUp: 0,
        canvasHeadUp: 0,
        canvasLookahead: 0,
        canvasSizeX: 0,
        canvasSizeY: 0
    },
    pastTrail: {
        hours: 24,
        plotSize: 'Small'
    },
    viewport: {
        latitude: 0,
        longitude: 0,
        zoomLevel: 3
    },
    preferredLocation: {
        name: '',
        WKT: '',
        isPreferred: true
    },
    vizSettings: [],
    maps: [],
    tracking: {
        watchlists: [
            { name: "Watchlist 1", description: "First watchlist", mmsiList: [], isActive: false },
            { name: "Watchlist 2", description: "Second watchlist", mmsiList: [], isActive: false },
            { name: "Watchlist 3", description: "Third watchlist", mmsiList: [], isActive: false },
            { name: "Watchlist 4", description: "Fourth watchlist", mmsiList: [], isActive: false },
            { name: "Watchlist 5", description: "Fifth watchlist", mmsiList: [], isActive: false }
        ],
        trackColor: "#FFFF00"
    },
    ui: {
        searchBar: {
            x: 10,
            y: 10
        }
    }
};