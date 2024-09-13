const express = require('express');
const bodyParser = require('body-parser');
const shipsRouter = require('./Routes/ships.routes.js'); 
const geoRouter = require('./Routes/geo.routes.js');     
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require("swagger-jsdoc");

const app = express();
const port = 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ship and Geo API',
      version: '1.0.0',
      description: 'API for managing ship data and geographical shapes',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
  },
  apis: ['./Routes/*.js'], // This should include your ships.routes.js file
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

// Middleware
app.use(bodyParser.json());

// Use routers
app.use('/api/ships', shipsRouter);
app.use('/api/region-marking/', geoRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
});


