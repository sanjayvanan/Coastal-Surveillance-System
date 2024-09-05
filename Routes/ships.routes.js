const express = require("express");
const {
  getAll,
  Get_using_MMSI,
  getBoth_MMSI_ISO,
  GetIMO,
  get_By_name,
  getByCallSign,
  fetchByTime,
} = require("../Controller/ships.controller.js");
const router = express.Router();

router.get("/time/:start_time/:end_time", fetchByTime); // time confusion!!!!!
router.get("/imo/:imo", GetIMO);
router.get("/name/:name", get_By_name); // not working
router.get("/callsign/:callsign", getByCallSign); //problem
router.get("/", getAll);
router.get("/mmsi/:mmsi", Get_using_MMSI);
router.get("/:mmsi/:imo", getBoth_MMSI_ISO);

module.exports = router;
