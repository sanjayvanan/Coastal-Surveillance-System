 const { Pool } = require('pg');
 const moment = require('moment');


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
const get_By_name =  async (req, res) => {   ///////Wont work
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


// Endpoint to get ship by call sign           
const getByCallSign =  async (req, res) => {             // not working
    const { callSign } = req.params;
    try {
        const result = await pool.query('SELECT * FROM "Ship_data"."ais_data" WHERE callSign = $1', [callSign]);
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


//--------------------------------------------------------------
function convertToMillis(dateTime) {
    return moment(dateTime).valueOf();
}

// Endpoint to fetch ships that match the time parameters
const fetchByTime = async (req, res) => {
    const { start_time, end_time } = req.params;
    const startMillis = convertToMillis(start_time);
    const endMillis = convertToMillis(end_time);

    // try {
    //     // Ensure the milliseconds are valid
    //     if (isNaN(startMillis) || isNaN(endMillis)) {
    //         return res.status(400).json({ error: "Invalid date format" });
    //     }
    
      
    //     const query = `
    //         SELECT *
    //         FROM "Ship_data"."ais_data"
    //         WHERE start_time >= $1 AND end_time <= $2
    //         AND start_time IS NOT NULL
    //         AND end_time IS NOT NULL;
    //     `;

        
    //     const result = await pool.query(query, [startMillis, endMillis]); 
    //     res.json(result.rows);
    // } catch (err) {
    //     res.status(500).json({ error: err.message });
    //     console.error('Error:', err.message);
    // }
    res.json({startMillis,endMillis});

};


module.exports = {getAll, Get_using_MMSI, getBoth_MMSI_ISO, GetIMO, get_By_name, getByCallSign, fetchByTime}