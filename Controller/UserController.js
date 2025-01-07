const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const UserModel = require('../Model/UserSchema');
const SettingsModel = require('../Model/SettingsSchema');
const { SECRET_KEY } = require('../middleware/auth');
const SALT_ROUNDS = 10;

// Login endpoint
const ValidateUser = async (req, res) => {
    try {
        const { username, password } = req.body; 

        console.log("\n=== Login Attempt ===");
        console.log("Username:", username);

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        } 
        
        // Find user by username
        const user = await UserModel.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Username does not exist',
                errorType: 'username' 
            });
        }

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Attempting password verification");
        console.log("Input password:", password);
        console.log("Stored hashed password:", user.password);
        console.log("Password valid:", isPasswordValid);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Incorrect password',
                errorType: 'password'   
            });
        }

        // If we get here, username and password are correct
        const userObject = user.toObject();

        console.log("\n=== User Found ===");
        console.log("User ID:", userObject._id.toString());
        console.log("Username:", userObject.username);
        console.log("Is Admin:", Boolean(userObject.isAdmin));
        console.log("Raw isAdmin value:", userObject.isAdmin);
        console.log("Full user object:", JSON.stringify(userObject, null, 2));

        // If user is admin, log additional information
        if (userObject.isAdmin === true) {
            console.log("\n=== Admin User Detected ===");
            console.log("Admin privileges are enabled for this user");
        }

        // Update token generation with longer expiration and more secure options
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username,
                isAdmin: user.isAdmin
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        ); 

        // Set token in HTTP-only cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log("\n=== Login Success ===");
        console.log("Token generated successfully");
        
        // Send response with all necessary user information
        res.json({ 
            success: true, 
            message: 'User validated successfully',
            token: token,
            username: user.username,
            userId: user._id.toString(),
            isAdmin: user.isAdmin,
            // You can add additional user data here if needed
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
}



// Signup endpoint
const signup =  async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Check if username exists
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        } 

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user with hashed password
        const newUser = new UserModel({ 
            username, 
            password: hashedPassword // Store hashed password
        });
        await newUser.save(); 

        // Create default settings for the new user
        const defaultSettings = new SettingsModel({
            userId: newUser._id,
            general: {
                pastDataHours: 24,
                dataRefresh: 5,
                theme: 'Dark'
            },
            pastTrail: {
                hours: 24,
                plotSize: 'Small'
            },
            tracking: {
                mmsiList: [],  // Add empty MMSI list by default
                trackColor: "#FFFF00"  
            }
        });

        await defaultSettings.save();

        console.log('Created default settings for new user:', {
            userId: newUser._id,
            settings: defaultSettings
        });

        res.json({ 
            success: true, 
            message: 'User registered successfully' 
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
}

/// Protected route example
const Protect = (req, res) => {
    res.json({ 
        success: true, 
        message: 'Protected data', 
        user: req.user 
    });
};


// Get all users endpoint (protected, admin only)
const getUsers = async (req, res) => {
    try {
        // Check if the requesting user is an admin
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.',
            });
        }

        // Fetch all users, excluding passwords
        const users = await UserModel.find({}, { password: 0 });

        // Filter out users with isAdmin: true
        const nonAdminUsers = users.filter(user => !user.isAdmin);

        console.log('Fetched non-admin users:', nonAdminUsers);

        res.json({
            success: true,
            message: 'Users retrieved successfully',
            users: nonAdminUsers.map(user => ({
                id: user._id,
                username: user.username,
                isAdmin: user.isAdmin,
                // Add any other fields you want to include
            })),
        });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message,
        });
    }
}

// Add this to your backend code
const DeleteUsers =  async (req, res) => {
    try {
        // Check if the requesting user is an admin
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const userToDelete = await UserModel.findById(req.params.userId);
        
        // Prevent deletion of admin users
        if (userToDelete.isAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete admin users'
            });
        } 

        // Delete user's settings first
        await SettingsModel.findOneAndDelete({ userId: req.params.userId });

        await UserModel.findByIdAndDelete(req.params.userId);
        
        res.json({
            success: true,
            message: 'User and associated settings deleted successfully'
        });

    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

//to edit users 
const  UpdateUserName =  async (req, res) => {
    try {
        // Check if the requesting user is an admin
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { userId, newUsername } = req.body;

        // Check if new username already exists
        const existingUser = await UserModel.findOne({ 
            username: newUsername,
            _id: { $ne: userId } // Exclude the current user
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Update username
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { username: newUsername },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Username updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                isAdmin: updatedUser.isAdmin
            }
        });

    } catch (err) {
        console.error('Update username error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
}

//update password
const UpdatePassword =  async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { userId, newPassword } = req.body;

        // Password validation regex
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character'
            });
        } 

         // Hash new password
         const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { password: hashedPassword },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// //to create new user by admin
const AdminCreateUser = async (req, res) => {
    try {
        // Verify admin privileges
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Password validation regex
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character'
            });
        }

        // Check if username exists
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        } 

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user
        const newUser = new UserModel({ username, password: hashedPassword  });
        await newUser.save();

        // Create default settings
        const defaultSettings = new SettingsModel({
            userId: newUser._id,
            general: {
                pastDataHours: 24,
                dataRefresh: 5,
                theme: 'Dark'
            },
            pastTrail: {
                hours: 24,
                plotSize: 'Small'
            },
            tracking: {
                watchlists: [
                    {
                        name: "Watchlist 1",
                        description: "First watchlist",
                        mmsiList: [],
                        isActive: false
                    },
                    {
                        name: "Watchlist 2",
                        description: "Second watchlist",
                        mmsiList: [],
                        isActive: false
                    },
                    {
                        name: "Watchlist 3",
                        description: "Third watchlist",
                        mmsiList: [],
                        isActive: false
                    },
                    {
                        name: "Watchlist 4",
                        description: "Fourth watchlist",
                        mmsiList: [],
                        isActive: false
                    },
                    {
                        name: "Watchlist 5",
                        description: "Fifth watchlist",
                        mmsiList: [],
                        isActive: false
                    }
                ],
                trackColor: "#FFFF00"
            },
            ui: {
                searchBar: {
                    x: 10,
                    y: 10
                }
            }        
        });

        await defaultSettings.save();

        res.json({ 
            success: true, 
            message: 'User created successfully' 
        });

    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
}





module.exports = {ValidateUser, signup , Protect, getUsers, DeleteUsers, UpdateUserName, UpdatePassword, AdminCreateUser, SALT_ROUNDS}