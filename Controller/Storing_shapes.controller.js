const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const wkx = require('wkx');

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
        const { polygonCoords } = req.query;
        
        if (!polygonCoords) {
            return res.status(400).json({ error: 'Polygon coordinates are required' });
        }

        const shipsQuery = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude
            FROM track_list tl
            WHERE ST_Contains(
                ST_GeomFromText($1, 4326),
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326)
            )
        `;

        const shipsResult = await trackPool.query(shipsQuery, [polygonCoords]);

        res.status(200).json({
            message: 'Ships within polygon retrieved successfully',
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
        `;

        const result = await trackPool.query(query, [centerLon, centerLat, radius]);

        res.status(200).json({
            message: 'Ships within circle retrieved successfully',
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
        `;

        const result = await trackPool.query(query, [longitude, latitude, distance]);

        res.status(200).json({
            message: 'Ships near point retrieved successfully',
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
        `;

        const result = await trackPool.query(query, [lineCoords, distance]);

        res.status(200).json({
            message: 'Ships along line retrieved successfully',
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
    storePoints
};