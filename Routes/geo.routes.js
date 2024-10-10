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
    storePoints
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

module.exports = router;