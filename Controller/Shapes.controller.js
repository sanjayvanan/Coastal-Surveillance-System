const { Pool } = require('pg');
// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345',
    port: 5432,
});

const getPolygon = async (req, res) => {
    const { id } = req.params;


    try {
        const result = await pool.query('SELECT * FROM public.geopolygon WHERE gpolygonid = $1', [id]);

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Polygon not found');
        }
    } catch (err) {
        console.error('Error during database query:', err);
        res.status(500).send('Server Error');
    }
};



// Endpoint to get geocircle by ID
const getCircle = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM public.geocircle WHERE gcircleid = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).send('Geocircle not found');
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).send('Error retrieving geocircle');
    }
  };

  // Endpoint to get geoline by ID
  const getGeoLine = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM public.geoline WHERE glineid = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).send('Geoline not found');
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).send('Error retrieving geoline');
    }
  };
  

    // Endpoint to get geopoint by ID
  const getGioPoint =  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM public.geopoint WHERE gpointid = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).send('Geopoint not found');
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).send('Error retrieving geopoint');
    }
  };



  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//updaing the polygon
// PUT method to update polygon by ID
const updatePolygon = async (req, res) => {
    const { id } = req.params;
    const { gpolygonname, coordinates } = req.body;

    // Check for required fields: gpolygonname and coordinates
    if (!gpolygonname || !coordinates) {
        return res.status(400).send('Missing required fields: gpolygonname or coordinates');
    }

    // Construct POLYGON WKT from coordinates array
    const polygonCoords = coordinates.map(coord => coord.join(' ')).join(', ');
    const polygonWKT = `POLYGON ((${polygonCoords}))`;

    try {
        // SQL query to update the polygon in the database and return the updated row with WKT format
        const query = `
            UPDATE public.geopolygon
            SET gpolygonname = $1,
                gpolygon = ST_GeomFromText($2, 4326)
            WHERE gpolygonid = $3
            RETURNING gpolygonid, gpolygonname, ST_AsText(gpolygon) as gpolygon;  -- Convert the geometry to WKT format and include the ID
        `;
        const values = [gpolygonname, polygonWKT, id];

        // Execute the update query with parameter values
        const result = await pool.query(query, values);

        // Check if any rows were updated
        if (result.rowCount > 0) {
            // Return the updated polygon details including the ID
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send('Polygon not found');
        }
    } catch (error) {
        console.error('Error updating polygon:', error);
        res.status(500).send('Server error');
    }
};




// PUT method to update geocircle by ID
const updatGeoCircle = async (req, res) => {
    const { id } = req.params;
    const { gcirclename, center, radius } = req.body;

    if (!gcirclename || !center || !radius) {
        return res.status(400).send('Missing required fields: gcirclename, center, or radius');
    }

    try {
        // Update the geocircle and return the updated row
        const query = `
            UPDATE public.geocircle
            SET gcirclename = $1,
                gcenter = ST_GeomFromText($2, 4326),  
                gradius = $3
            WHERE gcircleid = $4
            RETURNING *; 
        `;
        const values = [gcirclename, `POINT(${center.join(' ')})`, radius, id];

        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
            // Return the updated geocircle details
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send('Geocircle not found');
        }
    } catch (error) {
        console.error('Error updating geocircle:', error);
        res.status(500).send('Server error');
    }
};


// PUT method to update geoline by ID
const updateGeoLine = async (req, res) => {
    const { id } = req.params;
    const { glinename, coordinates } = req.body;

    // Check for required fields: glinename and coordinates
    if (!glinename || !coordinates) {
        return res.status(400).send('Missing required fields: glinename or coordinates');
    }

    // Construct LINESTRING WKT from coordinates array
    const lineCoords = coordinates.map(coord => coord.join(' ')).join(', ');
    const lineWKT = `LINESTRING (${lineCoords})`;

    try {
        // SQL query to update the geoline in the database and return the updated row with WKT format
        const query = `
            UPDATE public.geoline
            SET glinename = $1,
                gline = ST_GeomFromText($2, 4326)
            WHERE glineid = $3
            RETURNING glineid, glinename, ST_AsText(gline) as gline;  -- Convert the geometry to WKT format and include the ID
        `;
        const values = [glinename, lineWKT, id];

        // Execute the update query with parameter values
        const result = await pool.query(query, values);

        // Check if any rows were updated
        if (result.rowCount > 0) {
            // Return the updated geoline details including the ID
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send('Geoline not found');
        }
    } catch (error) {
        console.error('Error updating geoline:', error);
        res.status(500).send('Server error');
    }
};



// PUT method to update geopoint by ID                             
const updateGeoPoint = async (req, res) => {
    const { id } = req.params;
    const { gpointname, coordinates } = req.body;

    // Check for required fields: gpointname and coordinates
    if (!gpointname || !coordinates) {
        return res.status(400).send('Missing required fields: gpointname or coordinates');
    }

    try {
        // SQL query to update the geopoint in the database and return the updated row with WKT format
        const query = `
            UPDATE public.geopoint
            SET gpointname = $1,
                gpoint = ST_GeomFromText($2, 4326)
            WHERE gpointid = $3
            RETURNING gpointid, gpointname, ST_AsText(gpoint) as gpoint;  -- Convert the geometry to WKT format and include the ID
        `;
        const values = [gpointname, coordinates, id]; // Use the coordinates as provided in WKT format

        // Execute the update query with parameter values
        const result = await pool.query(query, values);

        // Check if any rows were updated
        if (result.rowCount > 0) {
            // Return the updated geopoint details including the ID
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send('Geopoint not found');
        }
    } catch (error) {
        console.error('Error updating geopoint:', error);
        res.status(500).send('Server error');
    }
};


 
 
module.exports = {getPolygon, getCircle, getGeoLine, getGioPoint, updatePolygon, updatGeoCircle, updateGeoLine, updateGeoPoint}

