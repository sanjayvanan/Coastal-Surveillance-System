const { Pool } = require('pg');
const moment = require('moment-timezone');

// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'track_user',
    host: '192.168.1.100',
    database: 'track_processor',
    password: 'qwerty',
    port: 5432,
});

// get all the ship data with pagination
const getAll = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    
    try {
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             ORDER BY t.mmsi 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await pool.query(`SELECT COUNT(*) FROM track_table`);
        const totalRows = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            meta: {
                totalRows,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRows / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ msg: "Problem in the fetch", error: err.message });
    }
}

// Endpoint to get ship by UUID
const Get_using_UUID = async (req, res) => {
    const { id } = req.params;

    // Validate UUID input
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: "Invalid UUID format" });
    }

    try {
        // Fetch ship data by UUID
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             WHERE t.uuid = $1`, 
            [id]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ message: 'Ship not found' });
        }
    } catch (err) {
        console.error('Error fetching ship by UUID:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Endpoint to get ship by MMSI
const Get_using_MMSI = async (req, res) => {
    const { mmsi } = req.params;
    try {
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             WHERE t.mmsi = $1`, 
            [mmsi]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Ship not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

//Get the ship data using ISO and MMSI number
const getBoth_MMSI_ISO =  async (req, res) => {
    const { mmsi, imo } = req.params;

    
    try {
        // Fetch the filtered results from the database
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             WHERE t.mmsi = $1 AND v.imo = $2`,
            [mmsi, imo]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: "Problem in the fetch", error: err.message });
    }
};

// Endpoint to get ship by IMO
const GetIMO = async (req, res) => {
    const { imo } = req.params;
    try {
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             WHERE v.imo = $1`, 
            [imo]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Ship not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Endpoint to get ship by name
const get_By_name = async (req, res) => {  
    const { name } = req.params;
    try {
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             WHERE v.vessel_name ILIKE $1`, 
            [`%${name}%`]
        );
        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).send('Ship not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const getByCallSign = async (req, res) => {
    let { callSign } = req.params;

    if (!callSign || typeof callSign !== 'string' || callSign.trim() === '') {
        return res.status(400).json({ error: "Invalid or missing callSign parameter" });
    }

    callSign = callSign.trim();

    try {
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_table t
             LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
             WHERE v.call_sign ILIKE $1`, 
            [`%${callSign}%`]
        );

        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).send('Ship not found');
        }
    } catch (err) {
        console.error('Error fetching ship by callSign:', err);
        res.status(500).send('Server Error');
    }
};

function convertToMillis(dateTime) {
    return moment.utc(dateTime).valueOf(); // Treat input as UTC and convert to milliseconds
}

// Endpoint to fetch ships that match the time parameters
const fetchByTime = async (req, res) => {
    const { start_time, end_time } = req.params;

    // Convert provided time range to milliseconds in UTC
    const startMillis = convertToMillis(start_time);
    const endMillis = convertToMillis(end_time);

    console.log('Start Time (ms):', startMillis);
    console.log('End Time (ms):', endMillis);
    try {
        // Check if the converted times are valid numbers
        if (isNaN(startMillis) || isNaN(endMillis)) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        const query = `
            SELECT t.*, v.*
            FROM track_table t
            LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
            WHERE t.sensor_timestamp >= $1 AND t.sensor_timestamp <= $2
            AND t.sensor_timestamp IS NOT NULL;
        `;

        const result = await pool.query(query, [startMillis, endMillis]);

        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ message: 'No ships found within the specified time range.' });
        }
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {getAll, Get_using_MMSI, Get_using_UUID, getBoth_MMSI_ISO, GetIMO, get_By_name, getByCallSign, fetchByTime}
