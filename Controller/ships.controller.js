 const { Pool } = require('pg');
 const moment = require('moment-timezone'); 


 // Connect to the PostgreSQL database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345',
    port: 5432,
});


// get all the ship data with pagination
const getAll = async(req,res)=>{
    const { page = 1, limit = 5 } = req.query;
    
        try {
            const offset = (page - 1) * limit;
    
            const result = await pool.query(
                `SELECT * FROM "Ship_data"."ais_data" ORDER BY mmsi LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
    
            const countResult = await pool.query(`SELECT COUNT(*) FROM "Ship_data"."ais_data"`);
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

// Endpoint to get ship by MMSI
const Get_using_MMSI = async (req, res) => {
    const { mmsi } = req.params;
    try {
        const result = await pool.query('SELECT * FROM "Ship_data"."ais_data" WHERE mmsi = $1', [mmsi]);
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
            `SELECT * FROM "Ship_data"."ais_data" WHERE mmsi = $1 AND imo = $2`,
            [mmsi, imo]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ msg: "Problem in the fetch", error: err.message });
    }
};


// Endpoint to get ship by IMO
const GetIMO =  async (req, res) => {
    const { imo } = req.params;
    try {
        const result = await pool.query('SELECT * FROM "Ship_data"."ais_data" WHERE imo = $1', [imo]);
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
const get_By_name =  async (req, res) => {  
    const { name } = req.params;
    try {
        const result = await pool.query('SELECT * FROM "Ship_data"."ais_data" WHERE name = $1', [name]);
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


const getByCallSign = async (req, res) => {                              /// need to work on it
    let { callSign } = req.params; // Assuming you get 'callSign' from req.params

    // Check if callSign is defined and is a string
    if (typeof callSign !== 'string') {
        return res.status(400).json({ error: "Invalid or missing callSign parameter" });
    }

    // Trim the callSign
    callSign = callSign.trim();

    try {
        // Replace with your actual query logic
        const result = await pool.query('SELECT * FROM "Ship_data"."ais_data" WHERE callsign = $1', [callSign]);

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


//--------------------------------------------------------------

// Convert local time to milliseconds since Unix epoch
function convertToMillis(dateTime, timeZone = 'UTC') {
    return moment.tz(dateTime, timeZone).valueOf();
}

// Endpoint to fetch ships that match the time parameters
const fetchByTime = async (req, res) => {
    const { start_time, end_time } = req.params;
    const { timeZone = 'UTC' } = req.query; // Time zone from query parameter, default to 'UTC'
    
    console.log('Requested Time Zone:', timeZone);

    // Convert provided time range to milliseconds in the specified time zone
    const startMillis = convertToMillis(start_time, timeZone);
    const endMillis = convertToMillis(end_time, timeZone);

    console.log('Start Time (ms):', startMillis);
    console.log('End Time (ms):', endMillis);

    try {
        if (isNaN(startMillis) || isNaN(endMillis)) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        const query = `
            SELECT *
            FROM "Ship_data"."ais_data"
            WHERE start_time >= $1 AND end_time <= $2
            AND start_time IS NOT NULL
            AND end_time IS NOT NULL;
        `;

        const result = await pool.query(query, [startMillis, endMillis]);

        // console.log('Query Result:', result.rows);  // Log the result for debugging
        
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

module.exports = {getAll, Get_using_MMSI, getBoth_MMSI_ISO, GetIMO, get_By_name, getByCallSign, fetchByTime}