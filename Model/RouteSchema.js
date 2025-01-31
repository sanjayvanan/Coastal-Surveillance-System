const mongoose = require('mongoose');

const RoutePointSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    coordinate: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        }
    },
    markerType: {
        type: String,
        default: 'default',
        enum: ['default', 'checkpoint', 'port', 'anchor', 'warning']
    }
});

const RouteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    points: [RoutePointSchema],
    totalDistance: {
        type: Number,
        required: true
    },
    lineColor: {
        type: String,
        default: 'green'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
});

module.exports = mongoose.model('Route', RouteSchema);