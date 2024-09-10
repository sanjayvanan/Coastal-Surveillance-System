const express = require('express');
const {getPolygon, getCircle, getGeoLine, getGioPoint, updatePolygon, updatGeoCircle, updateGeoLine, updateGeoPoint} = require('../Controller/Shapes.controller')
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

module.exports = router;