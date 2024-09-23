const { Pool } = require('pg');


// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'track_user',
    host: '192.168.1.100',
    database: 'track_processor_v2',
    password: 'zosh',
    port: 5432,
});


const trackList = async(req, res) =>{
    try {
        // Query to select all rows from the track_nav_status table
        const result = await pool.query('SELECT * FROM track_list');

        // Check if there are any results
        if (result.rows.length > 0) {
            res.json(result.rows); // Return the track navigation statuses
        } else {
            res.status(404).json({ message: 'No track List found' });
        }
    } catch (err) {
        console.error('Error fetching track Lists:', err);
        res.status(500).json({ error: 'Server Error' });
    }
}


module.exports = {trackList}