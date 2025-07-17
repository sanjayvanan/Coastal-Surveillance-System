# Coastal Surveillance System Backend

## Overview
This is the backend server for the Coastal Surveillance System, designed to manage ship tracking, geographical shapes, user authentication, notifications, and more. It provides a RESTful API for interacting with ship data, geographical objects (polygons, circles, lines, points), and system settings. The backend is built with Node.js, Express, MongoDB, and PostgreSQL, and supports real-time notifications via WebSockets.

## Features
- Ship tracking and history
- Geographical object management (polygons, circles, lines, points, squares)
- Intrusion detection and real-time alerts
- User authentication and settings
- Watchlist management
- Notification system
- Swagger API documentation

## Setup Instructions

### Prerequisites
- Node.js (v14+ recommended)
- npm
- MongoDB instance
- PostgreSQL instance

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Coastal-Surveillace-System
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment variables:**
   Create a `.env` file in the project root with the following content (adjust as needed):
   ```env
   PORT=3000
   MONGO_URI=mongodb: your mongo URI
   POSTGRES_HOST= localhost(your address)
   POSTGRES_PORT=5432
   POSTGRES_USER=track_user
   POSTGRES_PASSWORD=zosh
   POSTGRES_DB=track_processor_v2
   POSTGRES_USER_ADMIN=postgres
   POSTGRES_PASSWORD_ADMIN=12345
   POSTGRES_DB_ADMIN=postgres
   ```
4. **Start the server:**
   ```bash
   npm run dev
   # or
   node server.js
   ```

## API Documentation
Swagger UI is available at: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Main API Endpoints & Functions

### Ship Management
- `getAll` — Get all ship data (with pagination)
- `Get_using_MMSI` — Get ship by MMSI
- `Get_track_replay` — Get ship track replay
- `Get_using_UUID` — Get ship by UUID
- `getBoth_MMSI_ISO` — Get ship by both MMSI and IMO
- `GetIMO` — Get ship by IMO
- `get_By_name` — Get ship by name
- `getByCallSign` — Get ship by call sign
- `fetchByTime` — Get ships by time range
- `getShipTrackHistory` — Get ship track history (with optional simplification)
- `getAllMessageTypes` — Get all message types
- `getAllTrackTypes` — Get all track types
- `getAllTrackNavStatuses` — Get all navigation statuses
- `trackList` — Get recent track list
- `checkShipIntrusion` — Check if a ship is intruding a polygon

### Geographical Shapes Management
- `storePolygon`, `getPolygonById`, `updatePolygonById`, `deletePolygonById`, `getAllPolygons`
- `storeCircleAsPolygon`, `getAllCircles`
- `storeLine`, `getLineById`, `updateLineById`, `deleteLineById`, `getAllLines`, `getShipsAlongLine`, `getShipsCrossingLine`, `deleteMultipleLines`
- `storePoints`, `getAllPoints`, `updatePointById`, `deletePointById`, `deleteMultiplePoints`
- `storeSquare`, `getSquareById`, `updateSquareById`, `deleteSquareById`
- `getAllGraphicalObjects`

### Intrusion Detection & Notifications
- `updateIntrusionDetection` — Enable/disable polygons for intrusion detection
- `getIntrusionDetectionStatus` — Get current intrusion detection status
- `checkIntrusionsForAllEnabledPolygons` — Periodic check for intrusions
- `recordInitialShipsInPolygon` — Record ships present at the time of enabling detection
- `broadcastIntrusionEvent` — Send real-time intrusion events via WebSocket

### User & Settings
- User management and authentication via `/Routes/UserRoute`
- Settings management via `/Routes/SettingsRoute`
- Watchlist management via `/Routes/WatchlistRoute`

### Notification System
- Notification management via `/routes/notificationRoutes`

## Real-Time Features
- WebSocket server for broadcasting intrusion and alert events to connected clients.

## Development Notes
- Ensure MongoDB and PostgreSQL are running and accessible with the credentials in your `.env` file.
- For production, use strong passwords and secure your environment variables.
- The application uses both MongoDB (for users, notifications, settings) and PostgreSQL (for ship and geo data).

## License
This project is for internal use. Contact the maintainers for licensing information.
