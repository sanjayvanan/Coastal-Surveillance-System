const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { 
    ValidateUser, 
    signup, 
    Protect, 
    getUsers, 
    DeleteUsers, 
    UpdateUserName, 
    UpdatePassword, 
    AdminCreateUser 
} = require('../Controller/UserController');

// Routes
router.post('/validateUser', ValidateUser);
router.post('/signup', signup);
router.get('/protected', verifyToken, Protect);
router.get('/users', verifyToken, getUsers);
router.delete('/users/:userId', verifyToken, DeleteUsers);
router.post('/updateUsername', verifyToken, UpdateUserName);
router.post('/updatePassword', verifyToken, UpdatePassword);
router.post('/admin/createUser', verifyToken, AdminCreateUser);

module.exports = router;