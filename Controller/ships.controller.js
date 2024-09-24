const { Pool } = require('pg');
const moment = require('moment-timezone');

// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'track_user',
    host: '192.168.1.100',
    database: 'track_processor',
    password: 'zosh',
    port: 5432,
});

// Helper function to remove unwanted fields
const removeUnwantedFields = (obj) => {
    const { id, track_table__uuid, track_type__id, ...rest } = obj;
    return rest;
};

// get all the ship data with pagination
const getAll = async (req, res) => {
    const { page, limit } = req.query;

    // Check if both page and limit are not passed
    const isPaginationApplied = page !== undefined && limit !== undefined;

    try {
        let query = `
            SELECT t.*, v.* 
            FROM track_table t
            LEFT JOIN track_voyage_data v ON t.uuid = v.track_table__uuid
            ORDER BY t.mmsi
        `;

        let queryParams = [];
        if (isPaginationApplied) {
            // If pagination is applied, add limit and offset
            const offset = (page - 1) * limit;
            query += ` LIMIT $1 OFFSET $2`;
            queryParams = [limit, offset];
        }

        // Execute the query with or without pagination
        const result = await pool.query(query, queryParams);

        // Get the total count of rows in track_table
        const countResult = await pool.query(`SELECT COUNT(*) FROM track_table`);
        const totalRows = parseInt(countResult.rows[0].count);

        // Remove unwanted fields from the data
        const filteredData = result.rows.map(removeUnwantedFields);

        res.json({
            data: filteredData,
            meta: isPaginationApplied ? {
                totalRows,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRows / limit)
            } : {
                totalRows
            }
        });
    } catch (err) {
        res.status(500).json({ msg: "Problem in the fetch", error: err.message });
    }
};

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
            const filteredData = removeUnwantedFields(result.rows[0]);
            res.json(filteredData);
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
            const filteredData = removeUnwantedFields(result.rows[0]);
            res.json(filteredData);
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

        const filteredData = result.rows.map(removeUnwantedFields);
        res.json(filteredData);
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
            const filteredData = removeUnwantedFields(result.rows[0]);
            res.json(filteredData);
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
            const filteredData = result.rows.map(removeUnwantedFields);
            res.json(filteredData);
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
            const filteredData = result.rows.map(removeUnwantedFields);
            res.json(filteredData);
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
            const filteredData = result.rows.map(removeUnwantedFields);
            res.json(filteredData);
        } else {
            res.status(404).json({ message: 'No ships found within the specified time range.' });
        }
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Function to get ship track history by UUID
const getShipTrackHistory = async (req, res) => {
    const { uuid } = req.params;
    const { hours = 12 } = req.query; // Default to 12 hours if not specified

    // Validate UUID input
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
        return res.status(400).json({ error: "Invalid UUID format" });
    }

    // Validate hours input
    const parsedHours = parseInt(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
        return res.status(400).json({ error: "Invalid hours parameter" });
    }

    try {
        const currentTimeMs = Date.now();
        const hoursInMs = parsedHours * 60 * 60 * 1000;
        const startTimeMs = currentTimeMs - hoursInMs;

        const query = `SELECT latitude, longitude, speed_over_ground, course_over_ground, true_heading, rate_of_turn, sensor_timestamp, TO_TIMESTAMP(sensor_timestamp / 1000) AS formatted_timestamp FROM track_history WHERE track__uuid = $1 AND sensor_timestamp >= $2 ORDER BY sensor_timestamp DESC`;

        const result = await pool.query(query, [uuid, startTimeMs]);

        if (result.rows.length >0) {
            res.json({
                uuid: uuid,
                hours: parsedHours,
                trackHistory: result.rows.map(row => ({
                    ...row,
                    formatted_timestamp: row.formatted_timestamp.toISOString()
                }))
            });
        } else {
            res.status(404).json({ message: `No track history found for the given UUID in the last ${parsedHours} hours.${currentTimeMs} ${hoursInMs} ${startTimeMs}`, result1:result,
            query:`SELECT latitude,longitude,speed_over_ground,course_over_ground,true_heading,rate_of_turn,sensor_timestamp,TO_TIMESTAMP(sensor_timestamp / 1000) AS formatted_timestamp FROM track_history WHERE track__uuid = '${uuid}' AND sensor_timestamp >= '${startTimeMs}' ORDER BY sensor_timestamp DESC` });
        }
    } catch (err) {
        console.error('Error fetching ship track history:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};


//mesaage_types 
const getAllMessageTypes = async (req, res) => {
    try {
        // Query to select all rows from the message_types table
        const result = await pool.query('SELECT * FROM message_types');

        // Check if there are any results
        if (result.rows.length > 0) {
            res.json(result.rows); // Return the message types
        } else {
            res.status(404).json({ message: 'No message types found' });
        }
    } catch (err) {
        console.error('Error fetching message types:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};


// Function to get all track types
const getAllTrackTypes = async (req, res) => {
    try {
        // Query to select all rows from the track_type table
        const result = await pool.query('SELECT * FROM track_type');

        // Check if there are any results
        if (result.rows.length > 0) {
            res.json(result.rows); // Return the track types
        } else {
            res.status(404).json({ message: 'No track types found' });
        }
    } catch (err) {
        console.error('Error fetching track types:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Function to get all track navigation statuses
const getAllTrackNavStatuses = async (req, res) => {
    try {
        // Query to select all rows from the track_nav_status table
        const result = await pool.query('SELECT * FROM track_nav_status');

        // Check if there are any results
        if (result.rows.length > 0) {
            res.json(result.rows); // Return the track navigation statuses
        } else {
            res.status(404).json({ message: 'No navigation statuses found' });
        }
    } catch (err) {
        console.error('Error fetching track navigation statuses:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};

const trackList = async(req, res) =>{

}

module.exports = {getAll, Get_using_MMSI, Get_using_UUID, getBoth_MMSI_ISO, GetIMO, get_By_name, getByCallSign, fetchByTime, getShipTrackHistory, getAllMessageTypes, getAllTrackTypes, getAllTrackNavStatuses,  trackList}
