const express = require('express');
const bodyParser = require('body-parser');
const shipsRouter = require('./Routes/ships.routes.js'); // Correct import path
const geoRouter = require('./Routes/geo.routes.js');     // Correct import path
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Connect to the PostgreSQL database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345',
    port: 5432,
});


//middleware
app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Use routers correctly
app.use('/api/ships', shipsRouter);
app.use('/api/region-marking/',geoRouter)



app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });


