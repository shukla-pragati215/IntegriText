const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================
// Middleware
// ============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// Multer Setup
// ============================
const upload = multer({
    storage: multer.memoryStorage()
});

// ============================
// Static Files
// ============================
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(__dirname, '..', 'public')));
}

// ============================
// MongoDB Connection
// ============================
let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    try {
        await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/integritext'
);
    

        isConnected = true;
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Error:', error.message);
        process.exit(1);
    }
}

// Auto connect for every API request
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({
            message: 'Database connection failed'
        });
    }
});

// ============================
// Models
// ============================
const User = require('./models/User');
const Scan = require('./models/Scan');
const ChatMessage = require('./models/ChatMessage');
const Contact = require('./models/Contact');

// ============================
// Auth Middleware
// ============================
const auth = require('./middleware/auth');

// ============================
// AUTH ROUTES
// ============================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Please fill all fields'
            });
        }

        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({
                message: 'User already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'integritext_secret_key_123',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Please fill all fields'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'integritext_secret_key_123',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Server error'
        });
    }
});

// Current User
app.get('/api/auth/me', auth, async (req, res) => {

    try {

        const user = await User.findById(req.user.id)
            .select('-password');

        res.json(user);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: 'Server error'
        });
    }
});

// ============================
// FILE UPLOAD
// ============================
app.post(
    '/api/scans/upload',
    auth,
    upload.single('file'),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: 'No file uploaded'
                });
            }

            const fileBuffer = req.file.buffer;
            const fileName = req.file.originalname.toLowerCase();

            let extractedText = '';

            if (fileName.endsWith('.txt')) {

                extractedText =
                    fileBuffer.toString('utf-8');

            } else if (fileName.endsWith('.pdf')) {

                const data = await pdfParse(fileBuffer);
                extractedText = data.text;

            } else if (fileName.endsWith('.docx')) {

                const result =
                    await mammoth.extractRawText({
                        buffer: fileBuffer
                    });

                extractedText = result.value;

            } else {

                return res.status(400).json({
                    message:
                        'Only TXT, PDF, DOCX allowed'
                });
            }

            res.json({
                text: extractedText.trim()
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: 'File processing failed'
            });
        }
    }
);

// ============================
// HOME ROUTE
// ============================
app.get('/', (req, res) => {
    res.send('API Running Successfully');
});

// ============================
// Start Server
// ============================
if (require.main === module) {

    app.listen(PORT, async () => {

        await connectDB();

        console.log(
            `Server running on port ${PORT}`
        );
    });
}

// ============================
// Export
// ============================
module.exports = app;