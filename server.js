const express = require('express');
const bodyParser = require('body-parser');
const shipsRouter = require('./Routes/ships.routes.js'); 
const geoRouter = require('./Routes/geo.routes.js');     

const app = express();
const port = 3000;


//middleware
app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Use routers correctly
app.use('/api/ships', shipsRouter);
app.use('/api/region-marking/',geoRouter)



app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });


