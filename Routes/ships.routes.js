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
} = require("../Controller/ships.controller.js");
const router = express.Router();

router.get("/time/:start_time/:end_time", fetchByTime);
router.get("/imo/:imo", GetIMO);
router.get("/name/:name", get_By_name);
router.get("/callsign/:callsign", getByCallSign);
router.get("/UUID/:id", Get_using_UUID);
router.get("/mmsi/:mmsi", Get_using_MMSI);
router.get("/:mmsi/:imo", getBoth_MMSI_ISO);
router.get("/", getAll);


module.exports = router;
