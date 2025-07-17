const express = require('express');
const {getPolygon, getCircle, getGeoLine, getGioPoint, updatePolygon, updatGeoCircle, updateGeoLine, updateGeoPoint} = require('../Controller/Shapes.controller')
const {
    storePolygon, 
    getShipsWithinPolygon, 
    getShipsWithinCircle,
    getShipsNearPoint,
    getShipsAlongLine,
    getPolygonById,
    updatePolygonById,
    deletePolygonById,
    getAllPolygons,
    getAllGraphicalObjects,
    getAllPoints,
    getAllCircles,
    storePoints,
    deleteMultiplePolygons,
    deletePointById,
    deleteMultiplePoints,
    storeLine,
    getShipsCrossingLine,
    deleteLineById,
    updateLineById,
    getLineById,
    getAllLines,
    deleteMultipleLines,
    updatePointById,
    storeSquare,
    getSquareById,
    updateSquareById,
    deleteSquareById,
    updateIntrusionDetection,
    checkShipIntrusion,
    storeCircleAsPolygon
} = require('../Controller/Storing_shapes.controller.js')
const router = express.Router();

/**
 * @swagger
 * /api/region-marking/getPolygon/{id}:
 *   get:
 *     summary: Get polygon by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Polygon not found
 */
router.get('/getPolygon/:id', getPolygon)

/**
 * @swagger
 * /api/region-marking/getCircle/{id}:
 *   get:
 *     summary: Get circle by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Circle not found
 */
router.get('/getCircle/:id', getCircle)

/**
 * @swagger
 * /api/region-marking/getLine/{id}:
 *   get:
 *     summary: Get line by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Line not found
 */
router.get('/getLine/:id', getGeoLine) 

/**
 * @swagger
 * /api/region-marking/getPoint/{id}:
 *   get:
 *     summary: Get point by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Point not found
 */
router.get('/getPoint/:id', getGioPoint)

/**
 * @swagger
 * /api/region-marking/updatePolygon/{id}:
 *   put:
 *     summary: Update polygon by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gpolygonname:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *     responses:
 *       200:
 *         description: Successful update
 *       404:
 *         description: Polygon not found
 */
router.put('/updatePolygon/:id', updatePolygon)

/**
 * @swagger
 * /api/region-marking/updateCircle/{id}:
 *   put:
 *     summary: Update circle by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gcirclename:
 *                 type: string
 *               center:
 *                 type: array
 *                 items:
 *                   type: number
 *               radius:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successful update
 *       404:
 *         description: Circle not found
 */
router.put('/updateCircle/:id', updatGeoCircle) 

/**
 * @swagger
 * /api/region-marking/updateLine/{id}:
 *   put:
 *     summary: Update line by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               glinename:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *     responses:
 *       200:
 *         description: Successful update
 *       404:
 *         description: Line not found
 */
router.put('/updateLine/:id', updateGeoLine)

/**
 * @swagger
 * /api/region-marking/updatePoint/{id}:
 *   put:
 *     summary: Update point by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gpointname:
 *                 type: string
 *               coordinates:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful update
 *       404:
 *         description: Point not found
 */
router.put('/updatePoint/:id', updateGeoPoint)

/**
 * @swagger
 * /api/region-marking/polygon/{id}:
 *   get:
 *     summary: Get polygon by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Polygon not found
 */
router.get('/polygon/:id', getPolygonById);

/**
 * @swagger
 * /api/region-marking/polygon/{id}:
 *   put:
 *     summary: Update polygon by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               polygonName:
 *                 type: string
 *               polygonCoords:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful update
 *       404:
 *         description: Polygon not found
 */
router.put('/polygon/:id', updatePolygonById);

/**
 * @swagger
 * /api/region-marking/polygon/{id}:
 *   delete:
 *     summary: Delete polygon by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful deletion
 *       404:
 *         description: Polygon not found
 */
router.delete('/polygon/:id', deletePolygonById);

router.post("/store-polygon", storePolygon)
router.get("/ships-within-polygon", getShipsWithinPolygon);
router.get("/ships-within-circle", getShipsWithinCircle);
router.get('/ships-near-point', getShipsNearPoint);
router.get('/ships-along-line', getShipsAlongLine);

/**
 * @swagger
 * /api/region-marking/polygons:
 *   get:
 *     summary: Get all polygons
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Server error
 */
router.get('/polygons', getAllPolygons);
router.get('/allGraphical_objects', getAllGraphicalObjects);

/**
 * @swagger
 * /api/region-marking/points:
 *   get:
 *     summary: Get all points
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Server error
 */
router.get('/points', getAllPoints);

/**
 * @swagger
 * /api/region-marking/circles:
 *   get:
 *     summary: Get all circles
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Server error
 */
router.get('/circles', getAllCircles);

/**
 * @swagger
 * /api/region-marking/store-points:
 *   post:
 *     summary: Store multiple points
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               points:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     coordinates:
 *                       type: array
 *                       items:
 *                         type: number
 *                       minItems: 2
 *                       maxItems: 2
 *     responses:
 *       201:
 *         description: Points stored successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/store-points', storePoints);

/**
 * @swagger
 * /api/region-marking/polygons:
 *   delete:
 *     summary: Delete multiple polygons by IDs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Successful deletion
 *       404:
 *         description: One or more polygons not found
 *       500:
 *         description: Server error
 */
router.delete('/polygons', deleteMultiplePolygons);

/**
 * @swagger
 * /api/region-marking/point/{id}:
 *   delete:
 *     summary: Delete point by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Point deleted successfully
 *       404:
 *         description: Point not found
 *       500:
 *         description: Server error
 */
router.delete('/point/:id', deletePointById);

/**
 * @swagger
 * /api/region-marking/points:
 *   delete:
 *     summary: Delete multiple points by IDs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Points deleted successfully
 *       404:
 *         description: One or more points not found
 *       500:
 *         description: Server error
 */
router.delete('/points', deleteMultiplePoints);

/**
 * @swagger
 * /api/region-marking/store-line:
 *   post:
 *     summary: Store a monitoring line
 *     tags: [Lines]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - coordinates
 *             properties:
 *               name:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 minItems: 2
 *                 maxItems: 2
 *     responses:
 *       201:
 *         description: Line stored successfully
 */
router.post('/store-line', storeLine);

/**
 * @swagger
 * /api/region-marking/ships-crossing-line/{lineId}:
 *   get:
 *     summary: Get ships crossing a specific line
 *     tags: [Lines]
 *     parameters:
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: timeWindow
 *         schema:
 *           type: integer
 *         description: Time window in minutes (default 60)
 *     responses:
 *       200:
 *         description: List of ships crossing the line
 */
router.get('/ships-crossing-line/:lineId', getShipsCrossingLine);

/**
 * @swagger
 * /api/region-marking/line/{id}:
 *   delete:
 *     summary: Delete a single line by ID
 *     tags: [Lines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The line ID to delete
 *     responses:
 *       200:
 *         description: Line deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *       404:
 *         description: Line not found
 *       500:
 *         description: Server error
 */
router.delete('/line/:id', deleteLineById);

/**
 * @swagger
 * /api/region-marking/lines:
 *   delete:
 *     summary: Delete multiple lines
 *     tags: [Lines]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Lines deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *                 deletedLines:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Lines not found
 *       500:
 *         description: Server error
 */
router.delete('/lines', deleteMultipleLines);

/**
 * @swagger
 * /api/region-marking/line/{id}:
 *   put:
 *     summary: Update line by ID
 *     tags: [Lines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 minItems: 2
 *                 maxItems: 2
 *     responses:
 *       200:
 *         description: Line updated successfully
 */
router.put('/line/:id', updateLineById);

/**
 * @swagger
 * /api/region-marking/line/{id}:
 *   get:
 *     summary: Get a line by ID
 *     tags: [Lines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The line ID
 *     responses:
 *       200:
 *         description: Line details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items:
 *                       type: number
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     unit:
 *                       type: string
 *                     created_by:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_by:
 *                       type: string
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 length:
 *                   type: object
 *                   properties:
 *                     kilometers:
 *                       type: string
 *       404:
 *         description: Line not found
 *       500:
 *         description: Server error
 */
router.get('/line/:id', getLineById);

/**
 * @swagger
 * /api/region-marking/lines:
 *   get:
 *     summary: Get all monitoring lines
 *     tags: [Lines]
 *     responses:
 *       200:
 *         description: List of all lines
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 lines:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       coordinates:
 *                         type: array
 *                         items:
 *                           type: array
 *                           items:
 *                             type: number
 *                       metadata:
 *                         type: object
 *                         properties:
 *                           unit:
 *                             type: string
 *                           created_by:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_by:
 *                             type: string
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                       length:
 *                         type: object
 *                         properties:
 *                           kilometers:
 *                             type: string
 *       500:
 *         description: Server error
 */
router.get('/lines', getAllLines);

/**
 * @swagger
 * /api/region-marking/point/{id}:
 *   put:
 *     summary: Update point by ID
 *     tags: [Points]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coordinates
 *             properties:
 *               name:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 2
 *                 maxItems: 2
 *     responses:
 *       200:
 *         description: Point updated successfully
 *       404:
 *         description: Point not found
 */
router.put('/point/:id', updatePointById);

/**
 * @swagger
 * /api/region-marking/square:
 *   post:
 *     summary: Store a new square
 *     tags: [Squares]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - coordinates
 *             properties:
 *               name:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 minItems: 4
 *                 maxItems: 4
 */
router.post('/square', storeSquare);

/**
 * @swagger
 * /api/region-marking/square/{id}:
 *   get:
 *     summary: Get a square by ID
 *     tags: [Squares]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/square/:id', getSquareById);

/**
 * @swagger
 * /api/region-marking/square/{id}:
 *   put:
 *     summary: Update a square by ID
 *     tags: [Squares]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put('/square/:id', updateSquareById);

/**
 * @swagger
 * /api/region-marking/square/{id}:
 *   delete:
 *     summary: Delete a square by ID
 *     tags: [Squares]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/square/:id', deleteSquareById);

/**
 * @swagger
 * /api/region-marking/update-intrusion-detection:
 *   post:
 *     summary: Update intrusion detection settings
 *     tags: [Intrusion Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               polygonIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               polygonTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Intrusion detection settings updated
 */
router.post('/update-intrusion-detection', updateIntrusionDetection);

/**
 * @swagger
 * /api/region-marking/check-intrusion:
 *   post:
 *     summary: Check ship intrusion
 *     tags: [Intrusion Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shipId:
 *                 type: integer
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               enabledPolygonIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Intrusion check results
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/check-intrusion', checkShipIntrusion);

/**
 * @swagger
 * /api/region-marking/store-circle-as-polygon:
 *   post:
 *     summary: Store a circle as a polygon approximation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - center
 *               - radius
 *               - name
 *             properties:
 *               center:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 2
 *                 maxItems: 2
 *                 description: [longitude, latitude]
 *               radius:
 *                 type: number
 *                 description: Radius in meters
 *               name:
 *                 type: string
 *                 description: Name of the circle
 *               segments:
 *                 type: integer
 *                 description: Number of segments for polygon approximation (default 64)
 *     responses:
 *       201:
 *         description: Circle stored as polygon successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/store-circle-as-polygon', storeCircleAsPolygon);

module.exports = router;