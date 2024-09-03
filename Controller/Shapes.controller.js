const { Pool } = require('pg');
// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345',
    port: 5432,
});



const updatePolygon =  async (req, res) => {
    const { id } = req.params;
    const { gpolygonname, coordinates } = req.body;

    if (!gpolygonname || !coordinates) {
        return res.status(400).send('Missing required fields: gpolygonname or coordinates');
    }

    const polygonCoords = coordinates.map(coord => coord.join(' ')).join(', ');
    const polygonWKT = `POLYGON ((${polygonCoords}))`;

    try {
        // Update the polygon in the database
        const query = `
            UPDATE public.geopolygon
            SET gpolygonname = $1,
                gpolygon = ST_GeomFromText($2, 4326)
            WHERE gpolygonid = $3
        `;
        const values = [gpolygonname, polygonWKT, id];

        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
            res.status(200).send('Polygon updated successfully'+values);
        } else {
            res.status(404).send('Polygon not found');
        }
    } catch (error) {
        console.error('Error updating polygon:', error);
        res.status(500).send('Server error');
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



  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PUT method to update geocircle by ID
const updatGeoCircle = async (req, res) => {
    const { id } = req.params;
    const { gcirclename, center, radius } = req.body;

    if (!gcirclename || !center || !radius) {
        return res.status(400).send('Missing required fields: gcirclename, center, or radius');
    }

    try {
        const query = `
            UPDATE public.geocircle
            SET gcirclename = $1,
                gcenter = ST_GeomFromText($2, 4326),  -- Use 'gcenter' instead of 'center'
                gradius = $3
            WHERE gcircleid = $4
        `;
        const values = [gcirclename, `POINT(${center.join(' ')})`, radius, id];

        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
            res.status(200).send('Geocircle updated successfully');
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
        // SQL query to update the geoline in the database
        const query = `
            UPDATE public.geoline
            SET glinename = $1,
                gline = ST_GeomFromText($2, 4326)  -- Using PostGIS function for LINESTRING geometry
            WHERE glineid = $3
        `;
        const values = [glinename, lineWKT, id];

        // Execute the update query with parameter values
        const result = await pool.query(query, values);

        // Check if any rows were updated
        if (result.rowCount > 0) {
            res.status(200).send('Geoline updated successfully');
        } else {
            res.status(404).send('Geoline not found');
        }
    } catch (error) {
        console.error('Error updating geoline:', error);
        res.status(500).send('Server error');
    }
};


// PUT method to update geopoint by ID                             
const updateGeoPoint  = async (req, res) => {
    const { id } = req.params;
    const { gpointname, coordinates } = req.body;

    if (!gpointname || !coordinates) {
        return res.status(400).send('Missing required fields: gpointname or coordinates');
    }

    try {
        const query = `
            UPDATE public.geopoint
            SET gpointname = $1,
                gpoint = ST_GeomFromText($2, 4326)
            WHERE gpointid = $3
        `;
        const values = [gpointname, coordinates, id]; // Use the coordinates as provided in WKT format

        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
            res.status(200).send('Geopoint updated successfully');
        } else {
            res.status(404).send('Geopoint not found');
        }
    } catch (error) {
        console.error('Error updating geopoint:', error);
        res.status(500).send('Server error');
    }
};





module.exports = {updatePolygon, getCircle, getGeoLine, getGioPoint, updatGeoCircle, updateGeoLine, updateGeoPoint}