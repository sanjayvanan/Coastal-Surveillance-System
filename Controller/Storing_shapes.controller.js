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
    const { gpolygonname, coordinates, gpolygonid } = req.body;

    try {
        console.log('Received request:', { gpolygonname, coordinates, gpolygonid });

        // Check if the table exists
        const checkTableQuery = `
            SELECT to_regclass('public.geopolygon') IS NOT NULL AS exists;
        `;
        const tableResult = await pool.query(checkTableQuery);
        if (!tableResult.rows[0].exists) {
            throw new Error('Table public.geopolygon does not exist');
        }

        // Get column information
        const columnInfoQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'geopolygon';
        `;
        const columnInfo = await pool.query(columnInfoQuery);
        console.log('Column info:', columnInfo.rows);

        // Determine the correct id type
        const gpolygonidColumn = columnInfo.rows.find(row => row.column_name === 'gpolygonid');
        if (!gpolygonidColumn) {
            throw new Error('gpolygonid column not found in geopolygon table');
        }

        let id;
        if (gpolygonidColumn.data_type === 'uuid') {
            id = gpolygonid || uuidv4();
        } else if (gpolygonidColumn.data_type === 'bigint') {
            id = gpolygonid ? BigInt(gpolygonid) : BigInt(Date.now());
        } else {
            throw new Error(`Unexpected column type for gpolygonid: ${gpolygonidColumn.data_type}`);
        }

        // Convert coordinates to WKT
        const polygonCoords = coordinates.map(coord => coord.join(' ')).join(', ');
        const polygonWKT = `POLYGON((${polygonCoords}))`;

        const query = `
            INSERT INTO public.geopolygon (gpolygonid, gpolygonname, gpolygon)
            VALUES ($1, $2, ST_GeomFromText($3, 4326))
            RETURNING *;
        `;
        console.log('Executing query:', query);
        console.log('Query parameters:', [id.toString(), gpolygonname, polygonWKT]);

        const result = await pool.query(query, [id.toString(), gpolygonname, polygonWKT]);
        console.log('Query result:', result.rows[0]);

        // Verify the insertion
        const verifyQuery = `
            SELECT gpolygonid, gpolygonname, ST_AsText(gpolygon) as gpolygon 
            FROM public.geopolygon 
            WHERE gpolygonid = $1;
        `;
        const verifyResult = await pool.query(verifyQuery, [id]);
        console.log('Verification query result:', verifyResult.rows[0]);

        res.status(201).json({ 
            message: 'Polygon stored successfully', 
            polygon: verifyResult.rows[0] 
        });
    } catch (err) {
        console.error('Error storing polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message, stack: err.stack });
    }
};

const getShipsWithinPolygon = async (req, res) => {
    try {
        console.log('Query parameters:', req.query);
        const { polygonCoords } = req.query;

        if (!polygonCoords) {
            console.log('No polygon coordinates provided');
            return res.status(400).json({ error: 'Polygon coordinates are required' });
        }

        console.log('Received polygon coordinates:', polygonCoords);

        // Query for all ships first
        const allShipsQuery = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude, 
                            tvd.vessel_name, tvd.destination
            FROM track_list tl
            JOIN track_voyage_data tvd ON tl.uuid = tvd.track_table__uuid
            LIMIT 10
        `;
        console.log('Executing all ships query:', allShipsQuery);
        const allShipsResult = await trackPool.query(allShipsQuery);
        console.log('All ships query result:', allShipsResult.rows);

        // Query for ships within this polygon
        const shipsQuery = `
            SELECT DISTINCT tl.mmsi, tl.track_name, tl.latitude, tl.longitude, 
                            tvd.vessel_name, tvd.destination
            FROM track_list tl
            JOIN track_voyage_data tvd ON tl.uuid = tvd.track_table__uuid
            WHERE ST_Contains(
                ST_GeomFromText($1, 4326), 
                ST_SetSRID(ST_MakePoint(tl.longitude, tl.latitude), 4326)
            )
        `;
        console.log('Executing ships within polygon query:', shipsQuery);
        const shipsResult = await trackPool.query(shipsQuery, [polygonCoords]);
        console.log('Ships within polygon query result:', shipsResult.rows);

        if (shipsResult.rows.length === 0) {
            return res.status(200).json({
                message: 'No ships found within the specified polygon',
                ships: [],
                allShips: allShipsResult.rows
            });
        }

        res.status(200).json({
            message: 'Ships within polygon retrieved successfully',
            ships: shipsResult.rows,
            allShips: allShipsResult.rows
        });
    } catch (err) {
        console.error('Error retrieving ships within polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

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

module.exports = { storePolygon, getShipsWithinPolygon, getShipsWithinCircle, getShipsNearPoint, getShipsAlongLine };