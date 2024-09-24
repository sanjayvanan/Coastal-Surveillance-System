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

        const query = `
            SELECT latitude, longitude, speed_over_ground, course_over_ground,
                   true_heading, rate_of_turn, sensor_timestamp,
                   TO_TIMESTAMP(sensor_timestamp / 1000) AS formatted_timestamp 
            FROM track_history 
            WHERE track__uuid = $1 AND sensor_timestamp >= $2 
            ORDER BY sensor_timestamp DESC
        `;

        const result = await pool.query(query, [uuid, startTimeMs]);

        if (result.rows.length > 0) {
            res.json({
                uuid: uuid,
                hours: parsedHours,
                trackHistory: result.rows.map(row => ({
                    ...row,
                    formatted_timestamp: row.formatted_timestamp.toISOString()
                }))
            });
        } else {
            res.status(404).json({
                message: `No track history found for the given UUID in the last ${parsedHours} hours.`,
                currentTimeMs,
                hoursInMs,
                startTimeMs,
                result
            });
        }
    } catch (err) {
        console.error('Error fetching ship track history:', err);
        res.status(500).json({ error: 'Server Error' });
    }
};



module.exports = {trackList, getShipTrackHistory}