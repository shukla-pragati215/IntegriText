const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {

    try {

        const authHeader = req.header('Authorization');

        if (!authHeader) {
            return res.status(401).json({
                message: 'No token, authorization denied'
            });
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Invalid token format'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'No token found'
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'integritext_secret_key_123'
        );

        req.user = decoded.user;

        next();

    } catch (err) {

        console.error(err);

        return res.status(401).json({
            message: 'Token is not valid',
            error: err.message
        });
    }
};