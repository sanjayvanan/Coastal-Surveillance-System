const express = require('express')
const {SaveSettings,SaveSetting,SavePreferredLocation,SaveViewportAndTheme, GetViewportAndTheme, GetSettings,GetSetting,SaveUIPosition, GetUIPosition,GetLayerMap,UpdateLayerMap} = require('../Controller/SettingsController')
const jwt = require('jsonwebtoken');
const { verifyToken, SECRET_KEY } = require('../middleware/auth');

const router = express.Router()

// Verify token middleware
// const verifyToken = (req, res, next) => {
//     const token = req.headers.authorization?.split(' ')[1];
    
//     if (!token) {
//         return res.status(401).json({ 
//             success: false, 
//             message: 'No token provided' 
//         });
//     }

//     try {
//         const decoded = jwt.verify(token, SECRET_KEY);
//         req.user = decoded;
//         next();
//     } catch (err) {
//         return res.status(401).json({ 
//             success: false, 
//             message: 'Invalid token' 
//         });
//     }
// };

router.post('/saveSettings', verifyToken, SaveSettings)
router.post('/savePreferredLocation', verifyToken, SavePreferredLocation)
router.post('/saveViewportAndTheme', verifyToken, SaveViewportAndTheme)
router.get('/getViewportAndTheme/:userId',verifyToken, GetViewportAndTheme)
router.get('/getSettings/:userId', verifyToken, GetSettings)
router.get('/saveUIPosition', verifyToken, SaveUIPosition)
router.get('/getUIPosition/:userId', verifyToken, GetUIPosition)
router.get('/getLayerMap/:userId',verifyToken, GetLayerMap)
router.put('/updateLayerMap/:userId',verifyToken, UpdateLayerMap)

router.put('/saveSetting', verifyToken, SaveSetting)
router.get('/getSetting/:userId', verifyToken, GetSetting)


module.exports = router