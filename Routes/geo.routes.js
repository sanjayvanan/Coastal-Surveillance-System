const express = require('express');
const {getPolygon, getCircle, getGeoLine, getGioPoint, updatePolygon, updatGeoCircle, updateGeoLine, updateGeoPoint} = require('../Controller/Shapes.controller')
const router = express.Router();

router.get('/getPolygon/:id', getPolygon)
router.get('/getCircle/:id', getCircle)
router.get('/getLine/:id', getGeoLine) 
router.get('/getPoint/:id', getGioPoint)

router.put('/updatePolygon/:id',updatePolygon)
router.put('/updateCircle/:id', updatGeoCircle) 
router.put('/updateLine/:id', updateGeoLine)
router.put('/updatePoint/:id', updateGeoPoint )

module.exports = router;