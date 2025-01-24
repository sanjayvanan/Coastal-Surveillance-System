const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const wkx = require('wkx');
const Notification = require('../model/NotificationSchema');


// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345',
    port: 5432,
});


// Connection pool for the track server
const trackPool = new Pool({
    user: 'track_user',
    host: '192.168.1.100',
    database: 'track_processor_v2',
    password: 'zosh',
    port: 5432,
});

const enabledPolygons = new Map(); // Store polygon ID -> type mapping
const INTRUSION_CHECK_INTERVAL = 60000; // 1 minute in milliseconds
const shipStates = new Map(); // Track ship states: Map<polygonId_shipId, boolean>

const storePolygon = async (req, res) => {
    try {
        const { polygonCoords, polygonName } = req.body;
        
        if (!polygonCoords || !polygonName) {
            return res.status(400).json({ error: 'Polygon coordinates and name are required' });
        }

        // Get the maximum id from the graphical_objects table
        const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
        const maxIdResult = await trackPool.query(maxIdQuery);
        const nextId = maxIdResult.rows[0].next_id;

        // Store the polygon in the graphical_objects table
        const storePolygonQuery = `
            INSERT INTO graphical_objects (id, name, type, geometry, unit, created_by, created_at, updated_by, updated_at)
            VALUES ($1, $2, 'Polygon', ST_GeomFromText($3, 4326), 'meters', $4, EXTRACT(EPOCH FROM NOW())::bigint, $4, EXTRACT(EPOCH FROM NOW())::bigint)
            RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at;
        `;

        // Assuming you have a way to get the current user, otherwise use 'admin_user'
        const currentUser = req.user ? req.user.username : 'admin_user';

        const result = await trackPool.query(storePolygonQuery, [nextId, polygonName, polygonCoords, currentUser]);

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
        const  polygonCoords  = req.query.polygonCoords;
        
        if (!polygonCoords) {
            return res.status(400).json({ error: 'Polygon coordinates are required' });
        }

        const hours = parseInt(req.query.hours) || 24;
        const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);

        const shipsQuery = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude
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
            ships: shipsResult.rows
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
            SELECT id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at
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
            const { name, coordinates } = point;
            
            if (!name || !coordinates || coordinates.length !== 2) {
                return res.status(400).json({ error: 'Each point must have a name and valid coordinates [longitude, latitude]' });
            }

            // Get the maximum id from the graphical_objects table
            const maxIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM graphical_objects';
            const maxIdResult = await trackPool.query(maxIdQuery);
            const nextId = maxIdResult.rows[0].next_id;

            // Store the point in the graphical_objects table
            const storePointQuery = `
                INSERT INTO graphical_objects (id, name, type, geometry, unit, created_by, created_at, updated_by, updated_at)
                VALUES ($1, $2, 'Point', ST_SetSRID(ST_MakePoint($3, $4), 4326), 'meters', $5, EXTRACT(EPOCH FROM NOW())::bigint, $5, EXTRACT(EPOCH FROM NOW())::bigint)
                RETURNING id, name, type, ST_AsText(geometry) as geometry, unit, created_by, created_at, updated_by, updated_at;
            `;

            // Assuming you have a way to get the current user, otherwise use 'admin_user'
            const currentUser = req.user ? req.user.username : 'admin_user';

            const result = await trackPool.query(storePointQuery, [nextId, name, coordinates[0], coordinates[1], currentUser]);

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
        const { name, coordinates } = req.body;

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
                updated_at
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
                EXTRACT(EPOCH FROM NOW())::bigint
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
                updated_at;
        `;

        const currentUser = req.user ? req.user.username : 'admin_user';
        const result = await trackPool.query(query, [nextId, name, lineString, currentUser]);

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

// Modify the checkIntrusionsForAllEnabledPolygons function
const checkIntrusionsForAllEnabledPolygons = async (ship) => {
    if (enabledPolygons.size === 0) return;

    try {
        const currentTime = new Date();
        console.log(`\n=== Checking intrusions at ${currentTime.toISOString()} ===`);

        const polygonIds = Array.from(enabledPolygons.keys());
        const currentTimestamp = Date.now();

        const query = `
            SELECT 
                tl.uuid,
                tl.mmsi,
                tl.track_name,
                tl.latitude,
                tl.longitude,
                tl.sensor_timestamp,
                go.id as polygon_id,
                go.name as polygon_name
            FROM track_list tl
            CROSS JOIN (
                SELECT id, name, geometry 
                FROM graphical_objects 
                WHERE id = ANY($1::integer[])
            ) go
            WHERE ST_Contains(
                go.geometry,
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326)
            )
            AND tl.sensor_timestamp >= $2::bigint
        `;

        const timeWindow = Math.floor(Date.now() / 1000) - (5 * 60);
        const result = await trackPool.query(query, [polygonIds, timeWindow]);

        const currentShipStates = new Set();

        // Handle ship entries
        for (const ship of result.rows) {
            const stateKey = `${ship.polygon_id}_${ship.uuid}`;
            currentShipStates.add(stateKey);

            // Check if this is a new entry
            if (!shipStates.has(stateKey)) {
                const polygonType = enabledPolygons.get(ship.polygon_id.toString());

                console.log(`Creating new notification for Ship ID: ${ship.uuid} entering Polygon ID: ${ship.polygon_id}`);

                const existingNotification = await Notification.findOne({
                    ship_id: ship.uuid
                });

                if (existingNotification) {
                    // Add new alert to existing notification
                    existingNotification.alerts.push({
                        type: polygonType,
                        shape_id: ship.polygon_id.toString(),
                        sensor_timestamp: currentTimestamp,
                        entry_status: 'entered',
                        current: true,
                        user_id: 'admin',
                        acknowledged: false,
                        description: `Ship entered polygon ${ship.polygon_name}`
                    });
                    existingNotification.updatedAt = currentTimestamp;
                    await existingNotification.save();
                } else {
                    // Create new notification
                    const newNotification = new Notification({
                        ship_id: ship.uuid,
                        alerts: [{
                            type: polygonType,
                            shape_id: ship.polygon_id.toString(),
                            sensor_timestamp: currentTimestamp,
                            entry_status: 'entered',
                            current: true,
                            user_id: 'admin',
                            acknowledged: false,
                            description: `Ship entered polygon ${ship.polygon_name}`
                        }],
                        createdAt: currentTimestamp,
                        updatedAt: currentTimestamp
                    });
                    await newNotification.save();
                }

                // Mark the ship as inside the polygon
                shipStates.set(stateKey, true);
            }
        }

        // Handle ship exits
        for (const [stateKey, inPolygon] of shipStates.entries()) {
            if (!currentShipStates.has(stateKey) && inPolygon) {
                const [polygonId, shipId] = stateKey.split('_');

                console.log(`Ship ID: ${shipId} exited Polygon ID: ${polygonId}`);

                // Update the existing notification for the ship and polygon
                const existingNotification = await Notification.findOne({
                    ship_id: shipId,
                    'alerts.shape_id': polygonId
                });

                if (existingNotification) {
                    existingNotification.alerts.push({
                        type: enabledPolygons.get(polygonId.toString()),
                        shape_id: polygonId,
                        sensor_timestamp: currentTimestamp,
                        entry_status: 'exited',
                        current: false,
                        user_id: 'admin',
                        acknowledged: false,
                        description: `Ship exited polygon`
                    });
                    existingNotification.updatedAt = currentTimestamp;
                    await existingNotification.save();
                }

                // Remove the ship from the shipStates map
                shipStates.delete(stateKey);
            }
        }

    } catch (err) {
        console.error('Error in periodic intrusion check:', err.stack);
    }
};

// Modify the updateIntrusionDetection function to better handle polygon types
const updateIntrusionDetection = async (req, res) => {
    try {
        const { polygonIds, polygonTypes } = req.body;
        
        console.log('Received update request:', {
            polygonIds,
            polygonTypes
        });

        // Validate input
        if (!Array.isArray(polygonIds)) {
            return res.status(400).json({ 
                error: 'Invalid input', 
                message: 'polygonIds must be an array' 
            });
        }

        // Clear existing enabled polygons
        enabledPolygons.clear();
        
        // Update with new polygon IDs and their types
        polygonIds.forEach((id, index) => {
            const type = polygonTypes?.[index] || 'Warning';
            enabledPolygons.set(id.toString(), type);
        });

        // Clear existing interval if it exists
        if (global.intrusionCheckInterval) {
            clearInterval(global.intrusionCheckInterval);
            global.intrusionCheckInterval = null;
        }

        // Create new interval without username
        const checkIntrusions = () => checkIntrusionsForAllEnabledPolygons(null);
        global.intrusionCheckInterval = setInterval(checkIntrusions, INTRUSION_CHECK_INTERVAL);
        console.log('Started new intrusion check interval');

        res.status(200).json({
            message: 'Intrusion detection settings updated',
            enabledPolygons: Array.from(enabledPolygons.entries())
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
    checkShipIntrusion
};














