const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');  
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
const notificationRoutes = require('./routes/notificationRoutes');
const cookieParser = require('cookie-parser');
const { verifyToken, SECRET_KEY } = require('./middleware/auth');
const routeRoutes = require('./Routes/RouteRoutes'); 
const app = express();
const port = 3000;
const cors = require('cors');

// --- WEBSOCKET SERVER SETUP (ws) ---
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
global.wsClients = [];
wss.on('connection', function connection(ws) {
  console.log('WebSocket client connected');
  global.wsClients.push(ws);
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    global.wsClients = global.wsClients.filter(client => client !== ws);
  });
});
// --- END WEBSOCKET SERVER SETUP ---

const corsOptions = {
  origin: true,
  credentials: true,
}

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
app.use(cors(corsOptions));
// MongoDB connection
//mongodb+srv://zosh:zosh@zoshcpn.q40rq.mongodb.net/  
//mongodb+srv://zosh:zosh@zoshcpn.q40rq.mongodb.net/QT_Map
// 'mongodb+srv://admin:zosh@cluster0.yjlajv9.mongodb.net/map - Atlas DB link
mongoose.connect('mongodb://localhost:27017/map_local', {
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
app.use('/api', notificationRoutes);
app.use('/api/routes', routeRoutes); // Add this line to use the route routes

// --- REPLACE app.listen WITH server.listen ---
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
});
// --- END ---


