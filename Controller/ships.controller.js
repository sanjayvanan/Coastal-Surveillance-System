const { Pool } = require('pg');
const moment = require('moment-timezone');

// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'track_user',
    host: '192.168.1.100',
    database: 'track_processor_v2', // Updated database name
    password: 'zosh',
    port: 5432,
});

// Add this at the top of the file to track ship states
const shipStatesInPolygons = new Map(); // Format: 'shipId_polygonId' => boolean

// Helper function to remove unwanted fields
const removeUnwantedFields = (obj) => {
    const { created_at, created_by, updated_at, updated_by, ...rest } = obj;
    return rest;
};

// get all the ship data with pagination
const getAll = async (req, res) => {
    const { page, limit } = req.query;

    // Check if both page and limit are not passed
    const isPaginationApplied = page !== undefined && limit !== undefined;

    try {
        let query = `
            SELECT 
                tl.*,
                vd.id AS vd_id, 
                vd.imo, 
                vd.call_sign, 
                vd.vessel_name, 
                vd.dimension_to_bow, 
                vd.dimension_to_stern, 
                vd.dimension_to_port, 
                vd.dimension_to_starboard, 
                vd.destination, 
                vd.eta,
                mt.short_desc as message_type,
                ns.nav_status
            FROM 
                track_list tl
            LEFT JOIN 
                track_voyage_data vd ON tl.uuid = vd.track_table__uuid
            LEFT JOIN 
                message_types mt ON tl.message_type__id = mt.id
            LEFT JOIN 
                track_nav_status ns ON tl.track_nav_status__id = ns.id
            ORDER BY 
                tl.mmsi
        `;

        let queryParams = [];
        if (isPaginationApplied) {
            const offset = (page - 1) * limit;
            query += ` LIMIT $1 OFFSET $2`;
            queryParams = [limit, offset];
        }

        const result = await pool.query(query, queryParams);

        const countResult = await pool.query(`SELECT COUNT(*) FROM track_list`);
        const totalRows = parseInt(countResult.rows[0].count);

        // Add diagnostic information
        const diagnosticInfo = {
            totalRows,
            rowsReturned: result.rows.length,
            sampleRow: result.rows[0],
            nullVoyageDataCount: result.rows.filter(row => row.vd_id === null).length
        };

        const filteredData = result.rows.map(removeUnwantedFields);

        res.json({
            data: filteredData,
            meta: isPaginationApplied ? {
                totalRows,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRows / limit)
            } : {
                totalRows
            },
            diagnosticInfo
        });
    } catch (err) {
        console.error('Error fetching ships:', err);
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
            `SELECT tl.*, vd.imo, vd.call_sign, vd.vessel_name, vd.dimension_to_bow, 
                    vd.dimension_to_stern, vd.dimension_to_port, vd.dimension_to_starboard, 
                    vd.destination, vd.eta, 
                    mt.short_desc as message_type, 
                    ns.nav_status
             FROM track_list tl
             LEFT JOIN track_voyage_data vd ON tl.uuid = vd.track_table__uuid
             LEFT JOIN message_types mt ON tl.message_type__id = mt.id
             LEFT JOIN track_nav_status ns ON tl.track_nav_status__id = ns.id
             WHERE tl.uuid = $1`, 
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
             FROM track_list t
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

const Get_track_replay = async(req, res) => {
    const { mmsi, startTime, endTime } = req.body;
    
    try {
        const result = await pool.query(
            `WITH target_tracks AS (
                SELECT uuid, mmsi 
                FROM track_list 
                WHERE mmsi = ANY($1)
            )
            SELECT 
                tt.mmsi,
                th.track__uuid,
                th.latitude,
                th.longitude,
                th.height_depth,
                th.speed_over_ground,
                th.course_over_ground,
                th.true_heading,
                th.rate_of_turn,
                th.sensor_timestamp
            FROM track_history th
            INNER JOIN target_tracks tt ON th.track__uuid = tt.uuid
            WHERE th.sensor_timestamp BETWEEN $2 AND $3
            ORDER BY tt.mmsi, th.sensor_timestamp;`,
            [mmsi, startTime, endTime]
        );

        // Group results by MMSI
        const groupedResults = result.rows.reduce((acc, row) => {
            const mmsi = row.mmsi;
            
            // Create array for this MMSI if it doesn't exist
            if (!acc[mmsi]) {
                acc[mmsi] = [];
            }

            // Add the row data without the MMSI field
            const rowWithoutMmsi = {
                track__uuid: row.track__uuid,
                latitude: row.latitude,
                longitude: row.longitude,
                height_depth: row.height_depth,
                speed_over_ground: row.speed_over_ground,
                course_over_ground: row.course_over_ground,
                true_heading: row.true_heading,
                rate_of_turn: row.rate_of_turn,
                sensor_timestamp: row.sensor_timestamp
            };
            
            acc[mmsi].push(rowWithoutMmsi);
            return acc;
        }, {});

        res.json(groupedResults);

    } catch(err) {
        console.error('Error in Get_track_replay:', err);
        res.status(500).json({
            error: 'Server Error',
            message: err.message
        });
    }
};

//Get the ship data using ISO and MMSI number
const getBoth_MMSI_ISO =  async (req, res) => {
    const { mmsi, imo } = req.params;

    
    try {
        // Fetch the filtered results from the database
        const result = await pool.query(
            `SELECT t.*, v.* 
             FROM track_list t
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
             FROM track_list t
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
             FROM track_list t
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
             FROM track_list t
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
            FROM track_list t
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

const trackList = async (req, res) => {
    try {
        // Get the 'hours' parameter from the request query (default to 24 if not provided)
        const hours = parseInt(req.query.hours) || 24;

        // Calculate the timestamp for 'hours' ago
        const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Query to select regular tracks and always include tracks with message_type__id=1000
        // this is now just appending the data of 1000 with the normal tracks
        const query = `
            SELECT * 
            FROM track_list 
            WHERE sensor_timestamp >= $1
                OR message_type__id = 1000
            ORDER BY 
                CASE 
                    WHEN message_type__id = 1000 THEN 0 
                    ELSE 1 
                END,
                sensor_timestamp DESC
        `;

        const result = await pool.query(query, [hoursAgo.getTime()]);

        // Check if there are any results
        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ message: `No track list found for the past ${hours} hours` });
        }
    } catch (err) {
        console.error('Error fetching track Lists:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};



// Function to get ship track history by UUID
const getShipTrackHistory = async (req, res) => {
    const { uuid } = req.params;
    const { hours = 12, simplify = 'true' } = req.query; // Default to 12 hours and no simplification

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
        console.log("Original Length : " + result.rows.length);

        if (result.rows.length > 0) {
            let trackHistory;

            if (simplify === 'true') {
                // Extract coordinates for simplification
                const points = result.rows.map(row => ({
                    latitude: row.latitude,
                    longitude: row.longitude,
                    originalIndex: result.rows.indexOf(row)
                }));

                // Apply Douglas-Peucker algorithm
                const epsilon = 0.0004; // Adjust this value as needed
                const simplifiedPoints = douglasPeucker(points, epsilon);

                // Create simplified track history
                trackHistory = simplifiedPoints.map(point => {
                    const originalRow = result.rows[point.originalIndex];
                    return {
                        ...originalRow,
                        formatted_timestamp: originalRow.formatted_timestamp.toISOString()
                    };
                });
                console.log("Simplified Length : " + trackHistory.length);
            } else {
                // Use original data without simplification
                trackHistory = result.rows.map(row => ({
                    ...row,
                    formatted_timestamp: row.formatted_timestamp.toISOString()
                }));
            }

            res.json({
                uuid: uuid,
                hours: parsedHours,
                trackHistory: trackHistory,
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

// Helper function to calculate perpendicular distance
function perpendicularDistance(point, start, end) {
    const [x, y] = [point.longitude, point.latitude];
    const [x1, y1] = [start.longitude, start.latitude];
    const [x2, y2] = [end.longitude, end.latitude];

    const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

    return numerator / denominator;
}

// Recursive Douglas-Peucker algorithm implementation
function douglasPeucker(points, epsilon) {
    if (points.length <= 2) {
        return points;
    }

    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistance(points[i], start, end);
        if (distance > maxDistance) {
            maxDistance = distance;
            maxIndex = i;
        }
    }

    if (maxDistance > epsilon) {
        const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
        const right = douglasPeucker(points.slice(maxIndex), epsilon);
        return [...left.slice(0, -1), ...right];
    } else {
        return [start, end];
    }
}

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

const checkShipIntrusion = async (req, res) => {
    // // Add debug logging at the start
    // console.log("Received request body:", JSON.stringify(req.body, null, 2));
    
    // const { shipId, latitude, longitude, enabledPolygonIds, polygonTypes } = req.body;
    
    // // Validate required fields and polygonTypes
    // if (!polygonTypes || typeof polygonTypes !== 'object') {
    //     console.warn("polygonTypes is missing or invalid, using default Warning type");
    //     req.body.polygonTypes = {};  // Initialize as empty object if undefined
    // }
    
    // try {
    //     // Fetch ship data
    //     const result = await pool.query(
    //         `SELECT 
    //             tl.uuid,
    //             tl.mmsi,
    //             COALESCE(vd.vessel_name, tl.track_name) as ship_name
    //          FROM track_list tl
    //          LEFT JOIN track_voyage_data vd ON tl.uuid = vd.track_table__uuid
    //          WHERE tl.uuid = $1`,
    //         [shipId]
    //     );

    //     if (result.rows.length === 0) {
    //         return res.status(404).json({ error: "Ship not found" });
    //     }

    //     const shipDetails = result.rows[0];
    //     const shipName = shipDetails.ship_name || 'Unknown';
        
    //     // Simplified polygon query
    //     const polygonQuery = `
    //         SELECT id as polygon_id, name, type, ST_AsText(geometry) as geometry
    //         FROM graphical_objects 
    //         WHERE id = ANY($1::int[]) AND type = 'Polygon'`;

    //     const polygonResult = await pool.query(polygonQuery, [enabledPolygonIds]);

    //     // Check each enabled polygon
    //     for (const polygon of polygonResult.rows) {
    //         const stateKey = `${shipId}_${polygon.polygon_id}`;
    //         // Safely access polygonTypes with fallback
    //         const alertType = (req.body.polygonTypes && req.body.polygonTypes[polygon.polygon_id]) 
    //             ? req.body.polygonTypes[polygon.polygon_id] 
    //             : 'Warning';
            
    //         // Check if ship is inside polygon
    //         const isInsideResult = await pool.query(
    //             `SELECT ST_Contains(
    //                 geometry,
    //                 ST_SetSRID(ST_MakePoint($1, $2), 4326)
    //             ) as is_inside
    //             FROM graphical_objects 
    //             WHERE id = $3`,
    //             [longitude, latitude, polygon.polygon_id]
    //         );

    //         if (isInsideResult.rows.length === 0) continue;

    //         const is_inside = isInsideResult.rows[0].is_inside;
    //         const previousState = shipStatesInPolygons.get(stateKey);
            
    //         // Handle state changes
    //        if (is_inside && previousState === false) {
    //             console.log(`\n=== INTRUSION DETECTED ===`);
    //             console.log(`Time: ${new Date().toISOString()}`);
    //             console.log(`Ship: ${shipName} (UUID: ${shipDetails.uuid}, MMSI: ${shipDetails.mmsi})`);
    //             console.log(`Entered polygon: ${polygon.name} (ID: ${polygon.polygon_id})`);
    //             console.log(`Alert Type: ${alertType}`);
    //             console.log(`Position: ${latitude}, ${longitude}`);
    //             console.log(`=======================\n`);
    //             shipStatesInPolygons.set(stateKey, true);
    //         } 
    //         else if (!is_inside && previousState === true) {
    //             console.log(`\n=== EXIT DETECTED ===`);
    //             console.log(`Time: ${new Date().toISOString()}`);
    //             console.log(`Ship: ${shipName} (UUID: ${shipDetails.uuid}, MMSI: ${shipDetails.mmsi})`);
    //             console.log(`Exited polygon: ${polygon.name} (ID: ${polygon.polygon_id})`);
    //             console.log(`Position: ${latitude}, ${longitude}`);
    //             console.log(`========================\n`);
    //             shipStatesInPolygons.set(stateKey, false);
    //         }
    //         else {
    //             // Update state even if no change
    //             shipStatesInPolygons.set(stateKey, is_inside);
    //         }
    //     }

    //     res.json({ 
    //         success: true,
    //         message: "Intrusion check completed"
    //     });
        
    // } catch (err) {
    //     console.error('Error checking ship intrusion:', err);
    //     console.error('Request data:', {
    //         shipId,
    //         latitude,
    //         longitude,
    //         enabledPolygonIds,
    //         polygonTypes: req.body.polygonTypes
    //     });
    //     res.status(500).json({ error: err.message });
    // }
};// Add this new function to handle intrusion detection


module.exports = {getAll, Get_using_MMSI, Get_track_replay, Get_using_UUID, getBoth_MMSI_ISO, GetIMO, get_By_name, getByCallSign, fetchByTime, getShipTrackHistory, getAllMessageTypes, getAllTrackTypes, getAllTrackNavStatuses, trackList, checkShipIntrusion}
