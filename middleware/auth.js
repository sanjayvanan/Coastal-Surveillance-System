const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// const verifyToken = (req, res, next) => {
//     // Check both Authorization header and cookie
//     const token = req.headers.authorization?.split(' ')[1] || req.cookies.auth_token;
    
//     console.log('Auth Header:', req.headers.authorization);
//     console.log('Cookie Token:', req.cookies.auth_token);
    
//     if (!token) {
//         return res.status(401).json({ 
//             success: false, 
//             message: 'No token provided' 
//         });
//     }

//     try {
//         const decoded = jwt.verify(token, SECRET_KEY);
        
//         // Check if token is about to expire (e.g., less than 1 hour remaining)
//         const expirationTime = decoded.exp * 1000;
//         const oneHour = 60 * 60 * 1000;
        
//         if (expirationTime - Date.now() < oneHour) {
//             // Generate new token
//             const newToken = jwt.sign(
//                 { 
//                     userId: decoded.userId, 
//                     username: decoded.username,
//                     isAdmin: decoded.isAdmin
//                 },
//                 SECRET_KEY,
//                 { expiresIn: '24h' }
//             );
            
//             // Set new token in cookie
//             res.cookie('auth_token', newToken, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === 'production',
//                 sameSite: 'strict',
//                 maxAge: 24 * 60 * 60 * 1000
//             });
//         }
        
//         req.user = decoded;
//         next();
//     } catch (err) {
//         console.error('Token verification error:', err);
//         return res.status(401).json({ 
//             success: false, 
//             message: 'Invalid token',
//             error: err.message
//         });
//     }
// };

const verifyToken = (req, res, next) => {
    try {
        // Check both Authorization header and cookie
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : req.cookies?.auth_token;
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token',
            error: err.message
        });
    }
};

module.exports = { verifyToken, SECRET_KEY };
