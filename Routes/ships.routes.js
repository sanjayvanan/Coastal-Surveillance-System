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
  getShipTrackHistory
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
 *     summary: Get all ships with pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default: 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default: 10)
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Server error
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

module.exports = router;
