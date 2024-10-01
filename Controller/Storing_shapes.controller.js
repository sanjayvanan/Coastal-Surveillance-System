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
    const { polygonWKT } = req.params;

    try {
        // Decode the URL-encoded WKT
        const decodedPolygonWKT = decodeURIComponent(polygonWKT);

        const shipsQuery = `
            SELECT *
            FROM track_list
            WHERE ST_Within(
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
                ST_GeomFromText($1, 4326)
            );
        `;
        const shipsResult = await pool.query(shipsQuery, [decodedPolygonWKT]);

        res.status(200).json({
            message: 'Ships within polygon retrieved successfully',
            ships: shipsResult.rows
        });
    } catch (err) {
        console.error('Error retrieving ships within polygon:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};
 
module.exports = {storePolygon, getShipsWithinPolygon}