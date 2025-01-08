const express = require("express");
const {
  getAll,
  Get_using_MMSI,
  Get_using_UUID, 
  getBoth_MMSI_ISO,
  GetIMO,
  get_By_name,
  getByCallSign,
  fetchByTime,
  trackList,
  getShipTrackHistory,
  getAllMessageTypes,
  getAllTrackTypes,
  getAllTrackNavStatuses,
  checkShipIntrusion,
  Get_track_replay
} = require("../Controller/ships.controller.js");

const router = express.Router();

/**
 * @swagger
 * /api/ships/track-history/{uuid}:
 *   get:
 *     summary: Get ship track history by UUID
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *         description: "Number of hours of history to retrieve (default: 12)"
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid UUID or hours parameter
 *       404:
 *         description: No track history found
 *       500:
 *         description: Server error
 */
router.get("/track-history/:uuid", getShipTrackHistory);

/**
 * @swagger
 * /api/ships/time/{start_time}/{end_time}:
 *   get:
 *     summary: Fetch ships by time range
 *     parameters:
 *       - in: path
 *         name: start_time
 *         required: true
 *         schema:
 *           type: string
 *         description: Start time in UTC format
 *       - in: path
 *         name: end_time
 *         required: true
 *         schema:
 *           type: string
 *         description: End time in UTC format
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid date format
 *       404:
 *         description: No ships found within the specified time range
 *       500:
 *         description: Server error
 */
router.get("/time/:start_time/:end_time", fetchByTime);

/**
 * @swagger
 * /api/ships/imo/{imo}:
 *   get:
 *     summary: Get ship by IMO number
 *     parameters:
 *       - in: path
 *         name: imo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Ship not found
 *       500:
 *         description: Server error
 */
router.get("/imo/:imo", GetIMO);

/**
 * @swagger
 * /api/ships/name/{name}:
 *   get:
 *     summary: Get ship by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Ship not found
 *       500:
 *         description: Server error
 */
router.get("/name/:name", get_By_name);

/**
 * @swagger
 * /api/ships/callsign/{callsign}:
 *   get:
 *     summary: Get ship by call sign
 *     parameters:
 *       - in: path
 *         name: callsign
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid or missing callSign parameter
 *       404:
 *         description: Ship not found
 *       500:
 *         description: Server error
 */
router.get("/callsign/:callsign", getByCallSign);

/**
 * @swagger
 * /api/ships/UUID/{id}:
 *   get:
 *     summary: Get ship by UUID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid UUID format
 *       404:
 *         description: Ship not found
 *       500:
 *         description: Server error
 */
router.get("/UUID/:id", Get_using_UUID);

/**
 * @swagger
 * /api/ships/mmsi/{mmsi}:
 *   get:
 *     summary: Get ship by MMSI
 *     parameters:
 *       - in: path
 *         name: mmsi
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Ship not found
 *       500:
 *         description: Server error
 */
router.get("/mmsi/:mmsi", Get_using_MMSI);

/**
 * @swagger
 * /api/ships:
 *   get:
 *     summary: Get all ships
 *     description: Retrieve a list of all ships
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get("/", getAll);

/**
 * @swagger
 * /api/ships/{mmsi}/{imo}:
 *   get:
 *     summary: Get ship by MMSI and IMO
 *     parameters:
 *       - in: path
 *         name: mmsi
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Server error
 */
router.get("/:mmsi/:imo", getBoth_MMSI_ISO);


router.get("/Message-Types",getAllMessageTypes)
router.get("/TrackTypes", getAllTrackTypes)
router.get("/TrackNavStatuses", getAllTrackNavStatuses)
router.get("/trackList",  trackList)

/**
 * @swagger
 * /api/ships/check-intrusion:
 *   post:
 *     summary: Check ship intrusion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shipId:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/check-intrusion', checkShipIntrusion);



/**
 * @swagger
 * /api/ships/get-track-replay:
 *   post:
 *     summary: Get track replay data for multiple MMSIs
 *     description: Retrieves historical track data grouped by MMSI within a specified time range
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mmsi:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of MMSI numbers
 *                 example: ["412094702", "412112637"]
 *               startTime:
 *                 type: integer
 *                 format: int64
 *                 description: Start timestamp in milliseconds
 *                 example: 1736241175227
 *               endTime:
 *                 type: integer
 *                 format: int64
 *                 description: End timestamp in milliseconds
 *                 example: 1736244175227
 *     responses:
 *       200:
 *         description: Successfully retrieved track replay data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     track__uuid:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     height_depth:
 *                       type: number
 *                     speed_over_ground:
 *                       type: number
 *                     course_over_ground:
 *                       type: number
 *                     true_heading:
 *                       type: number
 *                     rate_of_turn:
 *                       type: number
 *                     sensor_timestamp:
 *                       type: integer
 *                       format: int64
 *             example:
 *               "412094702": [
 *                 {
 *                   "track__uuid": "123e4567-e89b-12d3-a456-426614174000",
 *                   "latitude": 12.345,
 *                   "longitude": 98.765,
 *                   "height_depth": 10.5,
 *                   "speed_over_ground": 15.2,
 *                   "course_over_ground": 180.0,
 *                   "true_heading": 182.5,
 *                   "rate_of_turn": 0.5,
 *                   "sensor_timestamp": 1736241175227
 *                 }
 *               ]
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid MMSI array or time range"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server Error"
 *                 message:
 *                   type: string
 *                   example: "Database connection error"
 */
router.post('/get-track-replay', Get_track_replay);

module.exports = router;
