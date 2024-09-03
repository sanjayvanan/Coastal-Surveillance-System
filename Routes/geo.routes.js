const express = require('express');
const {updatePolygon, getCircle, getGeoLine, getGioPoint, updatGeoCircle, updateGeoLine, updateGeoPoint} = require('../Controller/Shapes.controller')
const router = express.Router();

router.put('/updatePolygon/:id',updatePolygon)
router.get('/getCircle/:id', getCircle)
router.get('/getLine/:id', getGeoLine) 
router.get('/getPoint/:id', getGioPoint)

router.put('/updateCircle/:id', updatGeoCircle) 
router.put('/updateLine/:id', updateGeoLine)
router.put('/updatePoint/:id', updateGeoPoint )

module.exports = router;