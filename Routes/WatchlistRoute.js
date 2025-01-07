const express = require('express')
const {AddUUIDToWatchlist,DeleteMMSI,DeleteMMSIFromWatchlist,GetWatchLists} = require('../Controller/WatchlistController')
const jwt = require('jsonwebtoken');
const { verifyToken, SECRET_KEY } = require('../middleware/auth');

const router = express.Router()

router.post('/addUUIDToWatchlist', verifyToken, AddUUIDToWatchlist)
router.delete('/deleteMMSI/:userId/:mmsiId', verifyToken, DeleteMMSI) //not needed
router.delete('/deleteMMSIFromWatchlist/:userId/:watchlistName/:mmsiId', verifyToken, DeleteMMSIFromWatchlist) //needed
router.get('/getWatchlists/:userId', verifyToken, GetWatchLists)

module.exports = router