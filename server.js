const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');  // You'll need to install this package
const bcrypt = require('bcrypt');
const shipsRouter = require('./Routes/ships.routes.js'); 
const geoRouter = require('./Routes/geo.routes.js');     
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require("swagger-jsdoc");
const SALT_ROUNDS = 10; // Number of salt rounds for bcrypt
const UserRoute = require('./Routes/UserRoute')
const SettingsRoute = require('./Routes/SettingsRoute')
const SettingsModel = require('./Model/SettingsSchema')
const WatchlistRoute = require('./Routes/WatchlistRoute')
const cookieParser = require('cookie-parser');
const { verifyToken, SECRET_KEY } = require('./middleware/auth');



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
// Add cookie-parser middleware
app.use(cookieParser());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/QT_map', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

app.use('/', UserRoute)
app.use('/settings',SettingsRoute)
app.use('/watchlist',WatchlistRoute)
// Use routers
app.use('/api/ships', shipsRouter);
app.use('/api/region-marking/', geoRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
});


