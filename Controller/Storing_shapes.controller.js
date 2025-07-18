require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const wkx = require('wkx');
const Notification = require('../model/NotificationSchema');

// Helper function to create standardized meta structure
const createStandardizedMeta = (customMeta = {}) => {
    const defaultMeta = {
        type: null, // "point|line|polygon|circle|square|rectangle"
        isSynthetic: false,
        color: null,
        style: {
            lineStyle: "solid", // "solid|dashed|dotted"
            fillStyle: "solid", // "solid|transparent|pattern"
            lineWidth: 2,
            opacity: 1.0
        },
        center: null, // [longitude, latitude] - Only for circles/squares/rectangles
        radius: null, // Only for circles
        segments: 64, // Only for circles
        dimensions: { // Only for squares/rectangles
            width: null,
            height: null
        },
        description: null,
        icon: null,
        properties: {} // Custom user properties (last for extensibility)
    };
    
    return { ...defaultMeta, ...customMeta };
};

// Connect to the PostgreSQL database
const pool = new Pool({
    user: process.env.POSTGRES_USER_ADMIN,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB_ADMIN,
    password: process.env.POSTGRES_PASSWORD_ADMIN,
    port: process.env.POSTGRES_PORT,
});


// Connection pool for the track server
const trackPool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
});

const enabledPolygons = new Map(); // Store polygon ID -> type mapping
const INTRUSION_CHECK_INTERVAL = 30000; // 30 seconds in milliseconds
const shipStates = new Map(); // Track ship states: Map<polygonId_shipId, boolean>
const initialShipStates = new Map(); // Store polygon_id -> Set of ship_ids initially inside
const polygonNames = new Map();


const storePolygon = async (req, res) => {
    try {
        const { polygonCoords, polygonName, meta } = req.body;
        
        if (!polygonCoords || !polygonName) {
            return res.status(400).json({ error: 'Polygon coordinates and name are required' });
        }

        // Create standardized meta structure
        const standardizedMeta = createStandardizedMeta({
            type: "polygon",
            ...meta
        });

        // Get the maximum id from the graphical_objects table
        const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
        const maxIdResult = await trackPool.query(maxIdQuery);
        const nextId = maxIdResult.rows[0].next_id;

        // Store the polygon in the graphical_objects table
        const storePolygonQuery = `
            INSERT INTO graphical_objects (id, name, type, geometry, unit, created_by, created_at, updated_by, updated_at, meta)
            VALUES ($1, $2, 'Polygon', ST_GeomFromText($3, 4326), 'meters', $4, EXTRACT(EPOCH FROM NOW())::bigint, $4, EXTRACT(EPOCH FROM NOW())::bigint, $5)
            RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at, meta;
        `;

        // Assuming you have a way to get the current user, otherwise use 'admin_user'
        const currentUser = req.user ? req.user.username : 'admin_user';

        const result = await trackPool.query(storePolygonQuery, [nextId, polygonName, polygonCoords, currentUser, JSON.stringify(standardizedMeta)]);

        if (result.rows.length === 0) {
            return res.status(500).json({ error: 'Failed to store polygon' });
        }

        const storedPolygon = result.rows[0];

        res.status(201).json({
            message: 'Polygon stored successfully',
            polygon: storedPolygon
        });
    } catch (err) {
        console.error('Error storing polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

//get all the ships within a polygon
const getShipsWithinPolygon = async (req, res) => {
    try {
        const polygonCoords = req.query.polygonCoords;
        
        if (!polygonCoords) {
            return res.status(400).json({ error: 'Polygon coordinates are required' });
        }

        const hours = parseInt(req.query.hours) || 24;
        const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);

        // Retrieve the polygon name based on the coordinates
        const polygonNameQuery = `
            SELECT name FROM graphical_objects
            WHERE ST_Contains(geometry, ST_GeomFromText($1, 4326))
            LIMIT 1;
        `;
        const polygonNameResult = await trackPool.query(polygonNameQuery, [polygonCoords]);
        const polygonName = polygonNameResult.rows.length > 0 ? polygonNameResult.rows[0].name : 'Unknown Polygon';

        // Query to get all relevant ship details
        const shipsQuery = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude, 
                            tl.height_depth, tl.speed_over_ground, 
                            tl.course_over_ground, tl.true_heading, 
                            tl.rate_of_turn, tl.sensor_timestamp
            FROM track_list tl
            WHERE ST_Contains(
                ST_GeomFromText($1, 4326),
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326)
            )
            AND tl.sensor_timestamp >= $2
        `;

        const shipsResult = await trackPool.query(shipsQuery, [polygonCoords, hoursAgo]);
        res.status(200).json({
            message: 'Ships within polygon retrieved successfully',
            timeWindow: `Last ${hours} hours`,
            polygonName: polygonName, // Include the polygon name
            ships: shipsResult.rows.map(ship => ({
                mmsi: ship.mmsi,
                track_name: ship.track_name,
                latitude: ship.latitude,
                longitude: ship.longitude,
                height_depth: ship.height_depth,
                speed_over_ground: ship.speed_over_ground,
                course_over_ground: ship.course_over_ground,
                true_heading: ship.true_heading,
                rate_of_turn: ship.rate_of_turn,
                sensor_timestamp: ship.sensor_timestamp // Include timestamp
            }))
        });
    } catch (err) {
        console.error('Error retrieving ships within polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

//get the ships within a circle

const getShipsWithinCircle = async (req, res) => {
    try {
        const { centerLon, centerLat, radius } = req.query;
        const hours = parseInt(req.query.hours) || 24; // Default to 24 hours
        const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
        
        if (!centerLon || !centerLat || !radius) {
            return res.status(400).json({ error: 'Center longitude, latitude, and radius are required' });
        }

        const query = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude, 
                            tvd.vessel_name, tvd.destination
            FROM track_list tl
            JOIN track_voyage_data tvd ON tl.uuid = tvd.track_table__uuid
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326),
                ST_SetSRID(ST_MakePoint($1, $2), 4326),
                $3
            )
            AND tl.sensor_timestamp >= $4
        `;

        const result = await trackPool.query(query, [centerLon, centerLat, radius, hoursAgo]);

        res.status(200).json({
            message: 'Ships within circle retrieved successfully',
            timeWindow: `Last ${hours} hours`,
            ships: result.rows
        });
    } catch (err) {
        console.error('Error retrieving ships within circle:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const getShipsNearPoint = async (req, res) => {
    try {
        const { longitude, latitude, distance } = req.query;
        const hours = parseInt(req.query.hours) || 24; // Default to 24 hours
        const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
        
        if (!longitude || !latitude || !distance) {
            return res.status(400).json({ error: 'Longitude, latitude, and distance are required' });
        }

        const query = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude, 
                            tvd.vessel_name, tvd.destination
            FROM track_list tl
            JOIN track_voyage_data tvd ON tl.uuid = tvd.track_table__uuid
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326),
                ST_SetSRID(ST_MakePoint($1, $2), 4326),
                $3
            )
            AND tl.sensor_timestamp >= $4
        `;

        const result = await trackPool.query(query, [longitude, latitude, distance, hoursAgo]);

        res.status(200).json({
            message: 'Ships near point retrieved successfully',
            timeWindow: `Last ${hours} hours`,
            ships: result.rows
        });
    } catch (err) {
        console.error('Error retrieving ships near point:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Function to get ships along a line
const getShipsAlongLine = async (req, res) => {
    try {
        const { lineCoords, distance } = req.query;
        const hours = parseInt(req.query.hours) || 24; // Default to 24 hours
        const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
        
        if (!lineCoords || !distance) {
            return res.status(400).json({ error: 'Line coordinates and distance are required' });
        }

        const query = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude, 
                            tvd.vessel_name, tvd.destination
            FROM track_list tl
            JOIN track_voyage_data tvd ON tl.uuid = tvd.track_table__uuid
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326),
                ST_GeomFromText($1, 4326),
                $2
            )
            AND tl.sensor_timestamp >= $3
        `;

        const result = await trackPool.query(query, [lineCoords, distance, hoursAgo]);

        res.status(200).json({
            message: 'Ships along line retrieved successfully',
            timeWindow: `Last ${hours} hours`,
            ships: result.rows
        });
    } catch (err) {
        console.error('Error retrieving ships along line:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Retrieve a polygon by ID
const getPolygonById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at
            FROM graphical_objects
            WHERE id = $1 AND type = 'Polygon';
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Polygon not found' });
        }

        res.status(200).json({
            message: 'Polygon retrieved successfully',
            polygon: result.rows[0]
        });
    } catch (err) {
        console.error('Error retrieving polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Update a polygon by ID
const updatePolygonById = async (req, res) => {
    try {
        const { id } = req.params;
        const { polygonName, polygonCoords } = req.body;
        
        if (!polygonName || !polygonCoords) {
            return res.status(400).json({ error: 'Polygon name and coordinates are required' });
        }

        const query = `
            UPDATE graphical_objects
            SET name = $1, geometry = ST_GeomFromText($2, 4326), updated_by = $3, updated_at = EXTRACT(EPOCH FROM NOW())::bigint
            WHERE id = $4 AND type = 'Polygon'
            RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [polygonName, polygonCoords, currentUser, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Polygon not found' });
        }

        res.status(200).json({
            message: 'Polygon updated successfully',
            polygon: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Delete a polygon by ID
const deletePolygonById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            DELETE FROM graphical_objects
            WHERE id = $1 AND type = 'Polygon'
            RETURNING id;
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Polygon not found' });
        }

        res.status(200).json({
            message: 'Polygon deleted successfully',
            deletedId: result.rows[0].id
        });
    } catch (err) {
        console.error('Error deleting polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const getAllGraphicalObjects = async (req, res) => {
    try {
        const query = `
            SELECT id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at, meta
            FROM graphical_objects
            ORDER BY id;
        `;

        const result = await trackPool.query(query);

        res.status(200).json({
            message: 'Graphical objects retrieved successfully',
            objects: result.rows
        });
    } catch (err) {
        console.error('Error retrieving graphical objects:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};


// Retrieve all polygons
const getAllPolygons = async (req, res) => {
    try {
        const query = `
            SELECT id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at
            FROM graphical_objects
            WHERE type = 'Polygon'
            ORDER BY id;
        `;

        const result = await trackPool.query(query);

        res.status(200).json({
            message: 'Polygons retrieved successfully',
            polygons: result.rows
        });
    } catch (err) {
        console.error('Error retrieving polygons:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Retrieve all points
const getAllPoints = async (req, res) => {
    try {
        const query = `
            SELECT id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at
            FROM graphical_objects
            WHERE type = 'Point'
            ORDER BY id;
        `;

        const result = await trackPool.query(query);

        res.status(200).json({
            message: 'Points retrieved successfully',
            points: result.rows
        });
    } catch (err) {
        console.error('Error retrieving points:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Retrieve all circles (represented as points with radius)
const getAllCircles = async (req, res) => {                     // problem is that the radius is not in meters
    try {
        const query = `
            SELECT id, name, type, ST_AsText(geometry) as center, radius, unit, created_by, created_at, updated_by, updated_at
            FROM graphical_objects
            WHERE type = 'Point' AND radius IS NOT NULL
            ORDER BY id;
        `;

        const result = await trackPool.query(query);

        // Transform the results to include circle information
        const circles = result.rows.map(row => ({
            ...row,
            type: 'Circle',
            center: row.center,
            radius: parseFloat(row.radius)
        }));

        res.status(200).json({
            message: 'Circles retrieved successfully',
            circles: circles
        });
    } catch (err) {
        console.error('Error retrieving circles:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const storePoints = async (req, res) => {
    try {
        const { points } = req.body;
        
        if (!points || !Array.isArray(points) || points.length === 0) {
            return res.status(400).json({ error: 'Points array is required' });
        }

        const storedPoints = [];

        for (const point of points) {
            const { name, coordinates, meta } = point; // <-- extract meta
        
            if (!name || !coordinates || coordinates.length !== 2) {
                return res.status(400).json({ error: 'Each point must have a name and valid coordinates [longitude, latitude]' });
            }
        
            // Create standardized meta structure
            const standardizedMeta = createStandardizedMeta({
                type: "point",
                ...meta
            });
        
            // Get the maximum id from the graphical_objects table
            const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
            const maxIdResult = await trackPool.query(maxIdQuery);
            const nextId = maxIdResult.rows[0].next_id;
        
            // Store the point in the graphical_objects table, including meta
            const storePointQuery = `
                INSERT INTO graphical_objects (id, name, type, geometry, unit, created_by, created_at, updated_by, updated_at, meta)
                VALUES ($1, $2, 'Point', ST_SetSRID(ST_MakePoint($3, $4), 4326), 'meters', $5, EXTRACT(EPOCH FROM NOW())::bigint, $5, EXTRACT(EPOCH FROM NOW())::bigint, $6)
                RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at, meta;
            `;
        
            const currentUser = req.user ? req.user.username : 'admin_user';
        
            const result = await trackPool.query(storePointQuery, [
                nextId, name, coordinates[0], coordinates[1], currentUser, JSON.stringify(standardizedMeta)
            ]);
        
            if (result.rows.length === 0) {
                return res.status(500).json({ error: 'Failed to store point' });
            }
        
            storedPoints.push(result.rows[0]);
        }

        res.status(201).json({
            message: 'Points stored successfully',
            points: storedPoints
        });
    } catch (err) {
        console.error('Error storing points:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const deleteMultiplePolygons = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array of polygon IDs is required' });
        }

        const query = `
            DELETE FROM graphical_objects
            WHERE id = ANY($1::int[]) AND type = 'Polygon'
            RETURNING id;
        `;

        const result = await trackPool.query(query, [ids]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No polygons found for the provided IDs' });
        }

        const deletedIds = result.rows.map(row => row.id);

        res.status(200).json({
            message: 'Polygons deleted successfully',
            deletedIds: deletedIds
        });
    } catch (err) {
        console.error('Error deleting polygons:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Delete a point by ID
const deletePointById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            DELETE FROM graphical_objects
            WHERE id = $1 AND type = 'Point'
            RETURNING id;
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Point not found' });
        }

        res.status(200).json({
            message: 'Point deleted successfully',
            deletedId: result.rows[0].id
        });
    } catch (err) {
        console.error('Error deleting point:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Delete multiple points
const deleteMultiplePoints = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array of point IDs is required' });
        }

        const query = `
            DELETE FROM graphical_objects
            WHERE id = ANY($1) AND type = 'Point'
            RETURNING id;
        `;

        const result = await trackPool.query(query, [ids]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No points found for the provided IDs' });
        }

        const deletedIds = result.rows.map(row => row.id);

        res.status(200).json({
            message: 'Points deleted successfully',
            deletedIds: deletedIds
        });
    } catch (err) {
        console.error('Error deleting points:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Store a line with multiple points
const storeLine = async (req, res) => {
    try {
        const { name, coordinates, meta } = req.body;

        // Validate input
        if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: 'Required: name and coordinates array with at least 2 points'
            });
        }

        // Validate each coordinate pair
        const isValidCoordinates = coordinates.every(point => 
            Array.isArray(point) && 
            point.length === 2 && 
            typeof point[0] === 'number' && 
            typeof point[1] === 'number'
        );

        if (!isValidCoordinates) {
            return res.status(400).json({
                error: 'Invalid coordinates format',
                details: 'Each coordinate must be an array of [longitude, latitude]'
            });
        }

        // Create standardized meta structure
        const standardizedMeta = createStandardizedMeta({
            type: "line",
            ...meta
        });

        // Create LineString WKT
        const lineString = `LINESTRING(${coordinates.map(point => point.join(' ')).join(', ')})`;

        // Get the next ID
        const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
        const maxIdResult = await trackPool.query(maxIdQuery);
        const nextId = maxIdResult.rows[0].next_id;

        // Store the line
        const query = `
            INSERT INTO graphical_objects (
                id, 
                name, 
                type, 
                geometry, 
                unit, 
                created_by, 
                created_at, 
                updated_by, 
                updated_at,
                meta
            )
            VALUES (
                $1, 
                $2, 
                'LineString', 
                ST_GeomFromText($3, 4326), 
                'meters',
                $4,
                EXTRACT(EPOCH FROM NOW())::bigint,
                $4,
                EXTRACT(EPOCH FROM NOW())::bigint,
                $5
            )
            RETURNING 
                id, 
                name, 
                type, 
                ST_AsText(geometry) as geometry,
                unit,
                created_by,
                created_at,
                updated_by,
                updated_at,
                meta;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [nextId, name, lineString, currentUser, JSON.stringify(standardizedMeta)]);

        // Calculate line length
        const lengthQuery = `
            SELECT 
                ST_Length(
                    ST_Transform(
                        ST_GeomFromText($1, 4326),
                        3857
                    )
                ) / 1000 as length_km;
        `;
        const lengthResult = await trackPool.query(lengthQuery, [lineString]);

        res.status(201).json({
            message: 'Line stored successfully',
            line: {
                ...result.rows[0],
                length: {
                    kilometers: parseFloat(lengthResult.rows[0].length_km).toFixed(2)
                }
            }
        });
    } catch (err) {
        console.error('Error storing line:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Get ships crossing a line
const getShipsCrossingLine = async (req, res) => {
    try {
        const { lineId } = req.params;
        const timeWindow = parseInt(req.query.timeWindow) || 60; // Default 60 minutes
        
        // First, get the line geometry
        const lineQuery = `
            SELECT geometry 
            FROM graphical_objects 
            WHERE id = $1 AND type = 'LineString';
        `;
        
        const lineResult = await trackPool.query(lineQuery, [lineId]);
        
        if (lineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Line not found' });
        }

        const currentTime = Date.now();
        const pastTime = currentTime - (timeWindow * 60 * 1000); // Convert minutes to milliseconds

        // Query to find ships that crossed the line
        const query = `
            WITH consecutive_positions AS (
                SELECT 
                    t1.mmsi,
                    t1.sensor_timestamp as time1,
                    t1.latitude as lat1,
                    t1.longitude as lon1,
                    t2.sensor_timestamp as time2,
                    t2.latitude as lat2,
                    t2.longitude as lon2
                FROM track_list t1
                JOIN track_list t2 ON 
                    t1.mmsi = t2.mmsi AND
                    t2.sensor_timestamp = (
                        SELECT MIN(sensor_timestamp)
                        FROM track_list t3
                        WHERE t3.mmsi = t1.mmsi AND
                              t3.sensor_timestamp > t1.sensor_timestamp
                    )
                WHERE t1.sensor_timestamp >= $1
            )
            SELECT DISTINCT 
                cp.mmsi,
                tvd.vessel_name,
                tvd.call_sign,
                tvd.imo,
                cp.time1 as crossing_time,
                cp.lat1,
                cp.lon1,
                cp.lat2,
                cp.lon2
            FROM consecutive_positions cp
            LEFT JOIN track_voyage_data tvd ON cp.mmsi::text = tvd.mmsi::text
            WHERE ST_Intersects(
                ST_MakeLine(
                    ST_SetSRID(ST_MakePoint(cp.lon1, cp.lat1), 4326),
                    ST_SetSRID(ST_MakePoint(cp.lon2, cp.lat2), 4326)
                ),
                (SELECT geometry FROM graphical_objects WHERE id = $2)
            )
            ORDER BY crossing_time DESC;
        `;

        const result = await trackPool.query(query, [pastTime, lineId]);

        res.json({
            timeWindow,
            crossings: result.rows.map(row => ({
                mmsi: row.mmsi,
                vessel_name: row.vessel_name,
                call_sign: row.call_sign,
                imo: row.imo,
                crossing_time: new Date(parseInt(row.crossing_time)).toISOString(),
                crossing_position: {
                    latitude: row.lat1,
                    longitude: row.lon1
                }
            }))
        });
    } catch (err) {
        console.error('Error checking line crossings:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Delete a line by ID
const deleteLineById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            DELETE FROM graphical_objects
            WHERE id = $1 AND type = 'LineString'
            RETURNING id, name;
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Line not found',
                details: 'No line exists with the specified ID'
            });
        }

        res.status(200).json({
            message: 'Line deleted successfully',
            deleted: result.rows[0]
        });
    } catch (err) {
        console.error('Error deleting line:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Delete multiple lines
const deleteMultipleLines = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: 'Array of line IDs is required'
            });
        }

        const query = `
            DELETE FROM graphical_objects
            WHERE id = ANY($1::int[]) 
            AND type = 'LineString'
            RETURNING id, name;
        `;

        const result = await trackPool.query(query, [ids]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Lines not found',
                details: 'No lines found for the provided IDs'
            });
        }

        res.status(200).json({
            message: 'Lines deleted successfully',
            deletedCount: result.rows.length,
            deletedLines: result.rows
        });
    } catch (err) {
        console.error('Error deleting lines:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Update a line by ID
const updateLineById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, coordinates } = req.body;

        // Validate coordinates array
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
            return res.status(400).json({ 
                error: 'Invalid input', 
                details: 'Coordinates must be an array with at least 2 points' 
            });
        }

        // Validate each coordinate point
        const isValidCoordinates = coordinates.every(point => 
            Array.isArray(point) && 
            point.length === 2 && 
            typeof point[0] === 'number' && 
            typeof point[1] === 'number'
        );

        if (!isValidCoordinates) {
            return res.status(400).json({ 
                error: 'Invalid coordinates format',
                details: 'Each point must be an array of [longitude, latitude]'
            });
        }

        // Convert coordinates array to LineString format
        const lineString = `LINESTRING(${coordinates.map(point => point.join(' ')).join(', ')})`;

        const query = `
            UPDATE graphical_objects
            SET 
                name = COALESCE($1, name),
                geometry = ST_GeomFromText($2, 4326),
                updated_by = $3,
                updated_at = EXTRACT(EPOCH FROM NOW())::bigint
            WHERE id = $4 AND type = 'LineString'
            RETURNING 
                id, 
                name, 
                type, 
                ST_AsGeoJSON(geometry) as geometry,
                unit;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [name, lineString, currentUser, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Line not found' });
        }

        // Parse the GeoJSON geometry
        const geometryData = JSON.parse(result.rows[0].geometry);

        // Format the response
        const response = {
            message: 'Line updated successfully',
            line: {
                ...result.rows[0],
                geometry: geometryData,
                coordinates: geometryData.coordinates
            }
        };

        res.status(200).json(response);
    } catch (err) {
        console.error('Error updating line:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

const getLineById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                id,
                name,
                type,
                ST_AsGeoJSON(geometry) as geometry,
                unit,
                created_by,
                to_timestamp(created_at)::timestamp as created_at,
                updated_by,
                to_timestamp(updated_at)::timestamp as updated_at
            FROM graphical_objects 
            WHERE id = $1 AND type = 'LineString';
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Line not found',
                details: 'No line exists with the specified ID'
            });
        }

        // Parse the GeoJSON geometry
        const line = result.rows[0];
        const geometryData = JSON.parse(line.geometry);

        // Extract coordinates from GeoJSON
        const coordinates = geometryData.coordinates;

        // Format the response
        const response = {
            id: line.id,
            name: line.name,
            type: line.type,
            coordinates: coordinates,
            metadata: {
                unit: line.unit,
                created_by: line.created_by,
                created_at: line.created_at,
                updated_by: line.updated_by,
                updated_at: line.updated_at
            },
            // Calculate line length in kilometers
            length: {
                kilometers: parseFloat(
                    await calculateLineLength(coordinates)
                ).toFixed(2)
            }
        };

        res.status(200).json(response);
    } catch (err) {
        console.error('Error retrieving line:', err);
        res.status(500).json({ 
            error: 'Server Error', 
            details: err.message 
        });
    }
};

// Helper function to calculate line length
const calculateLineLength = async (coordinates) => {
    try {
        const query = `
            SELECT 
                ST_Length(
                    ST_Transform(
                        ST_SetSRID(
                            ST_MakeLine(
                                ST_MakePoint($1, $2),
                                ST_MakePoint($3, $4)
                            ),
                            4326
                        ),
                        3857  -- Web Mercator projection for better distance calculation
                    )
                ) / 1000 as length_km;
        `;

        const result = await trackPool.query(query, [
            coordinates[0][0], // start longitude
            coordinates[0][1], // start latitude
            coordinates[1][0], // end longitude
            coordinates[1][1]  // end latitude
        ]);

        return result.rows[0].length_km;
    } catch (err) {
        console.error('Error calculating line length:', err);
        return 0;
    }
};

const getAllLines = async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                name,
                type,
                ST_AsGeoJSON(geometry) as geometry,
                unit,
                created_by,
                to_timestamp(created_at)::timestamp as created_at,
                updated_by,
                to_timestamp(updated_at)::timestamp as updated_at
            FROM graphical_objects 
            WHERE type = 'LineString'
            ORDER BY created_at DESC;
        `;

        const result = await trackPool.query(query);

        // Format each line with calculated length
        const lines = await Promise.all(result.rows.map(async (line) => {
            const geometryData = JSON.parse(line.geometry);
            const coordinates = geometryData.coordinates;

            return {
                id: line.id,
                name: line.name,
                type: line.type,
                coordinates: coordinates,
                metadata: {
                    unit: line.unit,
                    created_by: line.created_by,
                    created_at: line.created_at,
                    updated_by: line.updated_by,
                    updated_at: line.updated_at
                },
                length: {
                    kilometers: parseFloat(
                        await calculateLineLength(coordinates)
                    ).toFixed(2)
                }
            };
        }));

        res.status(200).json({
            message: 'Lines retrieved successfully',
            count: lines.length,
            lines: lines
        });
    } catch (err) {
        console.error('Error retrieving lines:', err);
        res.status(500).json({ 
            error: 'Server Error', 
            details: err.message 
        });
    }
};

// Update a point by ID
const updatePointById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, coordinates } = req.body;

        if (!coordinates || coordinates.length !== 2) {
            return res.status(400).json({ 
                error: 'Invalid input. Required: coordinates [longitude, latitude]' 
            });
        }

        const query = `
            UPDATE graphical_objects
            SET 
                name = COALESCE($1, name),
                geometry = ST_SetSRID(ST_MakePoint($2, $3), 4326),
                updated_by = $4,
                updated_at = EXTRACT(EPOCH FROM NOW())::bigint
            WHERE id = $5 AND type = 'Point'
            RETURNING id, name, type, ST_AsText(geometry) as geometry, unit;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [
            name, 
            coordinates[0], // longitude
            coordinates[1], // latitude
            currentUser,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Point not found' });
        }

        res.status(200).json({
            message: 'Point updated successfully',
            point: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating point:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Store a square
const storeSquare = async (req, res) => {
    try {
        const { name, coordinates } = req.body;

        // Validate input
        if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length !== 4) {
            return res.status(400).json({ 
                error: 'Invalid input',
                details: 'Required: name and exactly 4 coordinates for a square'
            });
        }

        // Validate each coordinate point
        const isValidCoordinates = coordinates.every(point => 
            Array.isArray(point) && 
            point.length === 2 && 
            typeof point[0] === 'number' && 
            typeof point[1] === 'number'
        );

        if (!isValidCoordinates) {
            return res.status(400).json({ 
                error: 'Invalid coordinates format',
                details: 'Each point must be an array of [longitude, latitude]'
            });
        }

        // Create a closed polygon by adding the first point at the end
        const closedCoordinates = [...coordinates, coordinates[0]];
        const polygonString = `POLYGON((${closedCoordinates.map(point => point.join(' ')).join(', ')}))`;

        // Get the next ID
        const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
        const maxIdResult = await trackPool.query(maxIdQuery);
        const nextId = maxIdResult.rows[0].next_id;

        const query = `
            INSERT INTO graphical_objects (
                id, 
                name, 
                type, 
                geometry, 
                unit, 
                created_by, 
                created_at, 
                updated_by, 
                updated_at
            )
            VALUES (
                $1, 
                $2, 
                'Polygon',
                ST_GeomFromText($3, 4326), 
                'meters',
                $4,
                EXTRACT(EPOCH FROM NOW())::bigint,
                $4,
                EXTRACT(EPOCH FROM NOW())::bigint
            )
            RETURNING 
                id, 
                name, 
                type, 
                ST_AsGeoJSON(geometry) as geometry,
                unit,
                created_by,
                created_at,
                updated_by,
                updated_at;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [nextId, name, polygonString, currentUser]);

        res.status(201).json({
            message: 'Square stored successfully',
            square: {
                ...result.rows[0],
                geometry: JSON.parse(result.rows[0].geometry)
            }
        });
    } catch (err) {
        console.error('Error storing square:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Get square by ID
const getSquareById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                id,
                name,
                type,
                ST_AsGeoJSON(geometry) as geometry,
                unit,
                created_by,
                to_timestamp(created_at)::timestamp as created_at,
                updated_by,
                to_timestamp(updated_at)::timestamp as updated_at
            FROM graphical_objects 
            WHERE id = $1 AND type = 'Polygon'
            AND ST_NPoints(geometry) = 5;  -- 4 points + 1 closing point
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Square not found',
                details: 'No square exists with the specified ID'
            });
        }

        const square = result.rows[0];
        const geometryData = JSON.parse(square.geometry);

        res.status(200).json({
            id: square.id,
            name: square.name,
            type: square.type,
            coordinates: geometryData.coordinates[0].slice(0, -1), // Remove the last point (which is same as first)
            metadata: {
                unit: square.unit,
                created_by: square.created_by,
                created_at: square.created_at,
                updated_by: square.updated_by,
                updated_at: square.updated_at
            }
        });
    } catch (err) {
        console.error('Error retrieving square:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Update square by ID
const updateSquareById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, coordinates } = req.body;

        // Validate coordinates
        if (coordinates) {
            if (!Array.isArray(coordinates) || coordinates.length !== 4) {
                return res.status(400).json({ 
                    error: 'Invalid input',
                    details: 'Coordinates must be an array with exactly 4 points'
                });
            }

            const isValidCoordinates = coordinates.every(point => 
                Array.isArray(point) && 
                point.length === 2 && 
                typeof point[0] === 'number' && 
                typeof point[1] === 'number'
            );

            if (!isValidCoordinates) {
                return res.status(400).json({ 
                    error: 'Invalid coordinates format',
                    details: 'Each point must be an array of [longitude, latitude]'
                });
            }
        }

        // Create closed polygon
        const closedCoordinates = [...coordinates, coordinates[0]];
        const polygonString = `POLYGON((${closedCoordinates.map(point => point.join(' ')).join(', ')}))`;

        const query = `
            UPDATE graphical_objects
            SET 
                name = COALESCE($1, name),
                geometry = ST_GeomFromText($2, 4326),
                updated_by = $3,
                updated_at = EXTRACT(EPOCH FROM NOW())::bigint
            WHERE id = $4 AND type = 'Polygon'
            AND ST_NPoints(geometry) = 5
            RETURNING 
                id, 
                name, 
                type, 
                ST_AsGeoJSON(geometry) as geometry,
                unit;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [name, polygonString, currentUser, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Square not found' });
        }

        res.status(200).json({
            message: 'Square updated successfully',
            square: {
                ...result.rows[0],
                geometry: JSON.parse(result.rows[0].geometry)
            }
        });
    } catch (err) {
        console.error('Error updating square:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Delete square by ID
const deleteSquareById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            DELETE FROM graphical_objects
            WHERE id = $1 AND type = 'Polygon'
            AND ST_NPoints(geometry) = 5
            RETURNING id, name;
        `;

        const result = await trackPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Square not found',
                details: 'No square exists with the specified ID'
            });
        }

        res.status(200).json({
            message: 'Square deleted successfully',
            deleted: result.rows[0]
        });
    } catch (err) {
        console.error('Error deleting square:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Add this function to convert ISO date to Unix timestamp
const toUnixTimestamp = (date) => Math.floor(date.getTime() / 1000);

// Add this function near the top (after requires):
function broadcastIntrusionEvent(eventData) {
    // Build the message with the required structure
    const messageObj = {
        type: 'intrusion',
        event: eventData.event, // 'entry' or 'exit'
        shipId: eventData.shipId,
        polygonId: eventData.polygonId,
        polygonName: eventData.polygonName,
        timestamp: eventData.timestamp,
        alertType: eventData.type, // Use 'alertType' for warning/danger/etc.
        description: eventData.description
    };
    if (eventData.alertId) {
        messageObj.alertId = eventData.alertId;
    }
    const message = JSON.stringify(messageObj);
    console.log('Broadcasting intrusion event:', message, 'to', global.wsClients ? global.wsClients.length : 0, 'clients');
    if (global.wsClients) {
        global.wsClients.forEach(ws => {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
            }
        });
    }
}

// Function to record initial ships in a polygon
const recordInitialShipsInPolygon = async (polygonId) => {
    try {
        // Convert current time to milliseconds for comparison with sensor_timestamp
        const currentTimeMs = Date.now();
        const timeWindowMs = currentTimeMs - (5 * 60 * 1000); // Last 5 minutes in milliseconds

        const query = `
            WITH recent_ships AS (
                SELECT DISTINCT ON (uuid) uuid, sensor_timestamp, longitude, latitude
                FROM track_list
                WHERE sensor_timestamp >= $2::bigint  -- Compare with millisecond timestamp
                ORDER BY uuid, sensor_timestamp DESC
            )
            SELECT rs.uuid
            FROM recent_ships rs
            CROSS JOIN (
                SELECT geometry 
                FROM graphical_objects 
                WHERE id = $1
            ) go
            WHERE ST_Contains(
                go.geometry,
                ST_SetSRID(ST_MakePoint(rs.longitude, rs.latitude), 4326)
            )
        `;

        console.log(`Executing query for polygon ${polygonId} with time window: ${timeWindowMs}`);
        const result = await trackPool.query(query, [polygonId, timeWindowMs]);
        
        const initialShips = new Set(result.rows.map(row => row.uuid));
        initialShipStates.set(polygonId, initialShips);
        
        console.log(`Recorded ${initialShips.size} initial ships in polygon ${polygonId}`);
        
        // For newly added polygons, also initialize shipStates for ships currently inside
        // This prevents immediate exit alerts when the polygon is first enabled
        initialShips.forEach(shipId => {
            const stateKey = `${polygonId}_${shipId}`;
            shipStates.set(stateKey, true);
        });
        
    } catch (err) {
        console.error(`Error recording initial ships for polygon ${polygonId}:`, err);
    }
};

// Main intrusion checking function
const checkIntrusionsForAllEnabledPolygons = async () => {
    if (enabledPolygons.size === 0) return;

    try {
        const currentTime = new Date();
        const currentTimeMs = Date.now();
        const timeWindowMs = currentTimeMs - (5 * 60 * 1000); // Last 5 minutes in milliseconds

        console.log(`\n=== Checking intrusions at ${currentTime.toISOString()} ===`);

        const polygonIds = Array.from(enabledPolygons.keys());

        const query = `
            WITH recent_ships AS (
                SELECT DISTINCT ON (uuid) 
                    uuid, 
                    mmsi,
                    track_name,
                    latitude,
                    longitude,
                    sensor_timestamp
                FROM track_list
                WHERE sensor_timestamp >= $2::bigint
                ORDER BY uuid, sensor_timestamp DESC
            )
            SELECT 
                rs.*,
                go.id as polygon_id,
                go.name as polygon_name
            FROM recent_ships rs
            CROSS JOIN (
                SELECT id, name, geometry 
                FROM graphical_objects 
                WHERE id = ANY($1::integer[])
            ) go
            WHERE ST_Contains(
                go.geometry,
                ST_SetSRID(ST_MakePoint(rs.longitude, rs.latitude), 4326)
            )
        `;

        const result = await trackPool.query(query, [polygonIds, timeWindowMs]);
        
        // Group current ships by polygon
        const currentShipsByPolygon = new Map();
        const allCurrentShipStates = new Set();

        // Initialize maps for each polygon
        for (const polygonId of polygonIds) {
            currentShipsByPolygon.set(polygonId, new Set());
        }

        // Process current ships and group by polygon
        for (const ship of result.rows) {
            const polygonId = ship.polygon_id.toString();
            const stateKey = `${polygonId}_${ship.uuid}`;
            
            currentShipsByPolygon.get(polygonId).add(ship.uuid);
            allCurrentShipStates.add(stateKey);

            // Store polygon name for later use
            polygonNames.set(polygonId, ship.polygon_name);

            // Get initial ships for this polygon
            const initialShips = initialShipStates.get(polygonId);
            
            // Skip if this ship was initially inside the polygon
            if (initialShips && initialShips.has(ship.uuid)) {
                continue;
            }

            // Check if this is a new entry
            if (!shipStates.has(stateKey)) {
                const polygonType = enabledPolygons.get(polygonId);
                console.log(`New ship entry detected - Ship ID: ${ship.uuid} entering Polygon ID: ${polygonId}`);

                const existingNotification = await Notification.findOne({
                    ship_id: ship.uuid
                });

                if (existingNotification) {
                    // Add new alert to existing notification
                    existingNotification.alerts.push({
                        type: polygonType,
                        shape_id: polygonId,
                        polygon_name: ship.polygon_name,
                        sensor_timestamp: currentTimeMs,
                        entry_status: 'entered',
                        current: true,
                        user_id: 'admin',
                        acknowledged: false,
                        description: `Ship entered polygon ${ship.polygon_name}`
                    });
                    existingNotification.updatedAt = currentTimeMs;
                    await existingNotification.save();
                    // Get the last alert's _id
                    const alertId = existingNotification.alerts[existingNotification.alerts.length - 1]._id;
                    broadcastIntrusionEvent({
                        event: 'entry',
                        shipId: ship.uuid,
                        polygonId: polygonId,
                        polygonName: ship.polygon_name,
                        timestamp: currentTimeMs,
                        type: polygonType,
                        description: `Ship entered polygon ${ship.polygon_name}`,
                        alertId: alertId
                    });
                } else {
                    // Create new notification
                    const newNotification = new Notification({
                        ship_id: ship.uuid,
                        alerts: [{
                            type: polygonType,
                            shape_id: polygonId,
                            polygon_name: ship.polygon_name,
                            sensor_timestamp: currentTimeMs,
                            entry_status: 'entered',
                            current: true,
                            user_id: 'admin',
                            acknowledged: false,
                            description: `Ship entered polygon ${ship.polygon_name}`
                        }],
                        createdAt: currentTimeMs,
                        updatedAt: currentTimeMs
                    });
                    await newNotification.save();
                    // Get the last alert's _id
                    const alertId = newNotification.alerts[newNotification.alerts.length - 1]._id;
                    broadcastIntrusionEvent({
                        event: 'entry',
                        shipId: ship.uuid,
                        polygonId: polygonId,
                        polygonName: ship.polygon_name,
                        timestamp: currentTimeMs,
                        type: polygonType,
                        description: `Ship entered polygon ${ship.polygon_name}`,
                        alertId: alertId
                    });
                }

                // Mark the ship as inside the polygon
                shipStates.set(stateKey, true);
            }
        }

        // Handle ship exits - Check each polygon separately
        for (const [stateKey, inPolygon] of shipStates.entries()) {
            if (!allCurrentShipStates.has(stateKey) && inPolygon) {
                const [polygonId, shipId] = stateKey.split('_');
                
                // Get initial ships for this polygon
                const initialShips = initialShipStates.get(polygonId);
                
                // Skip if this ship was initially inside the polygon
                if (initialShips && initialShips.has(shipId)) {
                    continue;
                }

                const polygonData = enabledPolygons.get(polygonId);
                
                // Get polygon name from our stored names or fallback to database query
                let polygonName = polygonNames.get(polygonId);
                if (!polygonName) {
                    try {
                        const polygonQuery = 'SELECT name FROM graphical_objects WHERE id = $1';
                        const polygonResult = await trackPool.query(polygonQuery, [polygonId]);
                        polygonName = polygonResult.rows[0]?.name || '';
                        // Store it for future use
                        polygonNames.set(polygonId, polygonName);
                    } catch (err) {
                        console.error('Error fetching polygon name:', err);
                        polygonName = '';
                    }
                }

                console.log(`Ship exit detected - Ship ID: ${shipId} exited Polygon ID: ${polygonId} (${polygonName})`);

                const existingNotification = await Notification.findOne({
                    ship_id: shipId
                });

                if (existingNotification) {
                    // Add exit alert to existing notification
                    existingNotification.alerts.push({
                        type: polygonData,
                        shape_id: polygonId,
                        polygon_name: polygonName,
                        sensor_timestamp: currentTimeMs,
                        entry_status: 'exited',
                        current: false,
                        user_id: 'admin',
                        acknowledged: false,
                        description: `Ship exited polygon ${polygonName}`
                    });
                    existingNotification.updatedAt = currentTimeMs;
                    await existingNotification.save();
                    // Get the last alert's _id
                    const alertId = existingNotification.alerts[existingNotification.alerts.length - 1]._id;
                    broadcastIntrusionEvent({
                        event: 'exit',
                        shipId: shipId,
                        polygonId: polygonId,
                        polygonName: polygonName,
                        timestamp: currentTimeMs,
                        type: polygonData,
                        description: `Ship exited polygon ${polygonName}`,
                        alertId: alertId
                    });
                }

                // Remove the ship from the shipStates map
                shipStates.delete(stateKey);
            }
        }

        // Debug logging
        console.log(`Current ship states count: ${shipStates.size}`);
        console.log(`All current ship states count: ${allCurrentShipStates.size}`);

    } catch (err) {
        console.error('Error in periodic intrusion check:', err);
    }
};

// Fixed updateIntrusionDetection function
const updateIntrusionDetection = async (req, res) => {
    try {
        const { polygonIds, polygonTypes } = req.body;
        
        console.log('Received update request:', {
            polygonIds,
            polygonTypes
        });

        if (!Array.isArray(polygonIds)) {
            return res.status(400).json({ 
                error: 'Invalid input', 
                message: 'polygonIds must be an array' 
            });
        }

        // Get current enabled polygons before update
        const previouslyEnabledPolygons = new Set(enabledPolygons.keys());
        const newPolygonIds = new Set(polygonIds.map(id => id.toString()));
        
        // Find polygons to add and remove
        const polygonsToAdd = new Set([...newPolygonIds].filter(id => !previouslyEnabledPolygons.has(id)));
        const polygonsToRemove = new Set([...previouslyEnabledPolygons].filter(id => !newPolygonIds.has(id)));
        
        console.log('Polygons to add:', Array.from(polygonsToAdd));
        console.log('Polygons to remove:', Array.from(polygonsToRemove));
        
        // Remove polygons that are no longer needed
        for (const polygonId of polygonsToRemove) {
            enabledPolygons.delete(polygonId);
            initialShipStates.delete(polygonId);
            polygonNames.delete(polygonId);
            
            // Remove ship states for this polygon
            const statesToRemove = [];
            for (const [stateKey, inPolygon] of shipStates.entries()) {
                if (stateKey.startsWith(`${polygonId}_`)) {
                    statesToRemove.push(stateKey);
                }
            }
            statesToRemove.forEach(stateKey => shipStates.delete(stateKey));
            
            console.log(`Removed polygon ${polygonId} and its ${statesToRemove.length} ship states`);
        }
        
        // Add or update polygon types for existing polygons
        for (let i = 0; i < polygonIds.length; i++) {
            const polygonId = polygonIds[i].toString();
            const type = polygonTypes?.[i] || 'Warning';
            enabledPolygons.set(polygonId, type);
        }
        
        // Only record initial ships for newly added polygons
        for (const polygonId of polygonsToAdd) {
            console.log(`Recording initial ships for newly added polygon: ${polygonId}`);
            await recordInitialShipsInPolygon(polygonId);
        }

        // If this is the first time enabling intrusion detection, start the interval
        if (!global.intrusionCheckInterval && enabledPolygons.size > 0) {
            global.intrusionCheckInterval = setInterval(checkIntrusionsForAllEnabledPolygons, INTRUSION_CHECK_INTERVAL);
            console.log('Started new intrusion check interval');
        }
        
        // If no polygons are enabled, stop the interval
        if (enabledPolygons.size === 0 && global.intrusionCheckInterval) {
            clearInterval(global.intrusionCheckInterval);
            global.intrusionCheckInterval = null;
            console.log('Stopped intrusion check interval - no polygons enabled');
        }

        res.status(200).json({
            message: 'Intrusion detection settings updated',
            enabledPolygons: Array.from(enabledPolygons.entries()),
            addedPolygons: Array.from(polygonsToAdd),
            removedPolygons: Array.from(polygonsToRemove)
        });
    } catch (err) {
        console.error('Error in updateIntrusionDetection:', err);
        res.status(500).json({ 
            error: 'Server Error', 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// Optional: Add a function to get current status for debugging
const getIntrusionDetectionStatus = (req, res) => {
    try {
        const status = {
            enabledPolygons: Array.from(enabledPolygons.entries()),
            totalShipStates: shipStates.size,
            initialShipStates: Array.from(initialShipStates.entries()).map(([polygonId, ships]) => ({
                polygonId,
                shipCount: ships.size
            })),
            intervalRunning: !!global.intrusionCheckInterval,
            polygonNames: Array.from(polygonNames.entries())
        };
        
        res.status(200).json(status);
    } catch (err) {
        console.error('Error getting intrusion detection status:', err);
        res.status(500).json({ 
            error: 'Server Error', 
            details: err.message 
        });
    }
};

// Add this function to handle individual ship position updates
const checkShipIntrusion = async (req, res) => {
    // try {
    //     const { shipId, latitude, longitude } = req.body;
    //     const enabledPolygonIds = Array.from(enabledPolygons.keys());

    //     if (enabledPolygonIds.length === 0) {
    //         return res.json({ shipId, detections: [] });
    //     }

    //     const query = `
    //         SELECT id, name 
    //         FROM graphical_objects 
    //         WHERE id = ANY($1::integer[])
    //         AND ST_Contains(
    //             geometry,
    //             ST_SetSRID(ST_MakePoint($2, $3), 4326)
    //         )
    //     `;
        
    //     const result = await trackPool.query(query, [enabledPolygonIds, longitude, latitude]);
        
    //     const detections = result.rows.map(row => {
    //         const stateKey = `${row.id}_${shipId}`;
    //         const wasInPolygon = shipStates.has(stateKey);
    //         const type = enabledPolygons.get(row.id.toString());

    //         // Only mark as detected if this is a new entry
    //         if (!wasInPolygon) {
    //             shipStates.set(stateKey, true);
    //             return {
    //                 polygonId: row.id,
    //                 type,
    //                 detected: true,
    //                 name: row.name,
    //                 isNewEntry: true
    //             };
    //         }
    //         return null;
    //     }).filter(Boolean);

    //     // Check for exits
    //     enabledPolygonIds.forEach(polygonId => {
    //         const stateKey = `${polygonId}_${shipId}`;
    //         if (shipStates.has(stateKey) && !result.rows.find(row => row.id === polygonId)) {
    //             // Ship has exited this polygon
    //             console.log(`
    //             🚫 SHIP EXITED POLYGON (Real-time):
    //             ----------------------------------------
    //             Polygon ID: ${polygonId}
    //             Ship ID: ${shipId}
    //             ----------------------------------------`);
    //             shipStates.delete(stateKey);
    //         }
    //     });

    //     if (detections.length > 0) {
    //         console.log('\n🚨 NEW INTRUSION DETECTED:');
    //         detections.forEach(detection => {
    //             console.log(`
    //             ----------------------------------------
    //             Alert Type: ${detection.type}
    //             Polygon: ${detection.name} (ID: ${detection.polygonId})
    //             Ship ID: ${shipId}
    //             Position: ${latitude}, ${longitude}
    //             ----------------------------------------`);
    //         });
    //     }

    //     res.json({ shipId, detections });

    // } catch (err) {
    //     console.error('Error in checkShipIntrusion:', err);
    //     res.status(500).json({ 
    //         error: 'Server Error', 
    //         details: err.message 
    //     });
    // }
};

// Store a circle as a polygon approximation
const storeCircleAsPolygon = async (req, res) => {
    try {
        const { center, radius, name, segments = 64, meta } = req.body;
        if (!center || !Array.isArray(center) || center.length !== 2 || !radius || !name) {
            return res.status(400).json({ error: 'center (longitude, latitude), radius, and name are required' });
        }
        // Convert radius (meters) to degrees (approximate, valid for small circles)
        // 1 degree latitude ~ 111320 meters
        const lat = center[1];
        const lon = center[0];
        const earthRadius = 6378137; // meters
        const coords = [];
        for (let i = 0; i < segments; i++) {
            const angle = (2 * Math.PI * i) / segments;
            // Offset in meters
            const dx = radius * Math.cos(angle);
            const dy = radius * Math.sin(angle);
            // Offset in degrees
            const dLat = (dy / earthRadius) * (180 / Math.PI);
            const dLon = (dx / (earthRadius * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
            coords.push([lon + dLon, lat + dLat]);
        }
        // Close the polygon
        coords.push(coords[0]);
        const polygonCoords = `POLYGON((${coords.map(pt => pt.join(' ')).join(', ')}))`;
        
        // Create standardized meta structure with circle-specific properties
        const standardizedMeta = createStandardizedMeta({
            type: "circle",
            isSynthetic: true,
            center,
            radius,
            segments,
            ...meta // Allow additional meta properties to be passed
        });
        
        // Get the next ID
        const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
        const maxIdResult = await trackPool.query(maxIdQuery);
        const nextId = maxIdResult.rows[0].next_id;
        
        // Try to insert meta if the column exists, otherwise just return it in the response
        let result;
        let metaInserted = false;
        try {
            const query = `
                INSERT INTO graphical_objects (
                    id,
                    name,
                    type,
                    geometry,
                    unit,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at,
                    meta
                )
                VALUES (
                    $1,
                    $2,
                    'Polygon',
                    ST_GeomFromText($3, 4326),
                    'meters',
                    $4,
                    EXTRACT(EPOCH FROM NOW())::bigint,
                    $4,
                    EXTRACT(EPOCH FROM NOW())::bigint,
                    $5::jsonb
                )
                RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at, meta;
            `;
            const currentUser = req.user ? req.user.username : 'admin_user';
            result = await trackPool.query(query, [nextId, name, polygonCoords, currentUser, JSON.stringify(standardizedMeta)]);
            metaInserted = true;
        } catch (err) {
            // If meta column does not exist, fallback to insert without meta
            if (err.message && err.message.includes('column "meta"')) {
                const query = `
                    INSERT INTO graphical_objects (
                        id,
                        name,
                        type,
                        geometry,
                        unit,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    )
                    VALUES (
                        $1,
                        $2,
                        'Polygon',
                        ST_GeomFromText($3, 4326),
                        'meters',
                        $4,
                        EXTRACT(EPOCH FROM NOW())::bigint,
                        $4,
                        EXTRACT(EPOCH FROM NOW())::bigint
                    )
                    RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at;
                `;
                const currentUser = req.user ? req.user.username : 'admin_user';
                result = await trackPool.query(query, [nextId, name, polygonCoords, currentUser]);
            } else {
                throw err;
            }
        }
        if (!result || result.rows.length === 0) {
            return res.status(500).json({ error: 'Failed to store circle as polygon' });
        }
        const response = {
            message: 'Circle stored as polygon successfully',
            polygon: {
                ...result.rows[0],
                meta: metaInserted ? result.rows[0].meta : standardizedMeta
            }
        };
        res.status(201).json(response);
    } catch (err) {
        console.error('Error storing circle as polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

module.exports = { 
    storePolygon, 
    getShipsWithinPolygon, 
    getShipsWithinCircle, 
    getShipsNearPoint, 
    getShipsAlongLine,
    getPolygonById,
    updatePolygonById,
    deletePolygonById,
    getAllPolygons,
    getAllGraphicalObjects,
    getAllPoints,
    getAllCircles,
    storePoints,
    deleteMultiplePolygons,
    deletePointById,
    deleteMultiplePoints,
    storeLine,
    getShipsCrossingLine,
    deleteLineById,
    updateLineById,
    getLineById,
    getAllLines,
    deleteMultipleLines,
    updatePointById,
    storeSquare,
    getSquareById,
    updateSquareById,
    deleteSquareById,
    updateIntrusionDetection,
    getIntrusionDetectionStatus,
    checkShipIntrusion,
    checkIntrusionsForAllEnabledPolygons,
    recordInitialShipsInPolygon,
    broadcastIntrusionEvent,
    storeCircleAsPolygon
};














