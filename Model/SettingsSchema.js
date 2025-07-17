const mongoose= require("mongoose")


// Settings Schema - Update to include preferredLocation section
const SettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'users' },
    general: {            
        theme: { type: String, default: 'Dark', enum: ['Dark', 'Light'] },
    },
    CanvasConfig: {
        canvasVPLatLon: { type: String, default: "" },
        canvasVPLat: {type:Number,default:1},
        canvasVPLon: {type:Number,default:1},
        canvasVPScale: { type: Number, default: 1 },
        canvasVPRotation: { type: Number, default: 0 },
        canvasInitialdBIndex: { type: Number, default: 0 },
        canvasbFollow: { type: Number, default: 0 },
        ActiveChartGroup: { type: Number, default: 0 },
        canvasQuilt: { type: Number, default: 0 },
        canvasShowGrid: { type: Boolean, default: true },
        canvasShowOutlines: { type: Boolean, default: true },
        canvasShowDepthUnits: { type: Boolean, default: false },
        canvasShowAIS: { type: Number, default: 1 },
        canvasAttenAIS: { type: Number, default: 0 },
        canvasShowTides: { type: Number, default: 0 },
        canvasShowCurrents: { type: Number, default: 0 },
        canvasShowENCText: { type: Boolean, default: true },
        canvasENCDisplayCategory: { type: Number, default: 77 },
        canvasENCShowDepths: { type: Boolean, default: true },
        canvasENCShowBuoyLabels: { type: Boolean, default: true },
        canvasENCShowLightDescriptions: { type: Boolean, default: true },
        canvasENCShowLights: { type: Boolean, default: true },
        canvasENCShowVisibleSectorLights: { type: Boolean, default: false },
        canvasENCShowAnchorInfo: { type: Boolean, default: false },
        canvasENCShowDataQuality: { type: Number, default: false },
        canvasCourseUp: { type: Number, default: 0 },
        canvasHeadUp: { type: Number, default: 0 },
        canvasLookahead: { type: Number, default: 0 },
        canvasSizeX: { type: Number, default: 0 },
        canvasSizeY: { type: Number, default: 0 }
    },
    pastTrail: {
        hours: { type: Number, default: 24 },
        plotSize: { type: String, default: 'Small' }
    },
    trackConfig:{
        pastDataHours: { type: Number, default: 24 },
        dataRefresh: { type: Number, default: 5 }
    },
    unitConfig:{
        latlonUnit : { type:String , default:'Deg,Dec,Min'},
        timeZoneUnit : { type:String , default:'0.0'},
        distanceUnit : { type:String , default:"DISTANCE_NMI"},
        speedUnit : { type:String , default:"SPEED_KTS"},
        windspeedUnit : { type:String , default:"WSPEED_KTS"},
        tempUnit : {type:String , default:"TEMPERATURE_C"},
        depthUnit : { type:String ,default:"DEPTH_FT"}
    },
    preferredLocation: {
        name: { type: String, default: '' },
        WKT: { type: String, default: '' },
        isPreferred : { type: Boolean, default: true }
    },
    vizSettings: {
        type: [{
          name: { type: String, required: true },
          vizlayers: [{
            type: mongoose.Schema.Types.Mixed, // Flexible data type for layers
            default: {}
          }]
        //   createdAt: { type: Date, default: Date.now }
        }],
        default: [] // Default to an empty array
    },
    maps: {
        type: [String],
        default: [""]
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