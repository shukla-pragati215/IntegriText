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

// ============================
// PORT
// ============================
const PORT = process.env.PORT || 5000;

// ============================
// Middleware
// ============================
app.use(cors());

app.use(express.json({
    limit: '10mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// ============================
// Static Files
// ============================
app.use(express.static(
    path.join(__dirname, '..', 'public')
));

// ============================
// Multer Setup
// ============================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// ============================
// MongoDB Connection
// ============================
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null
    };
}

async function connectDB() {

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {

        cached.promise = mongoose.connect(
            process.env.MONGODB_URI,
            {
                bufferCommands: false
            }
        ).then((mongoose) => {
            console.log('MongoDB Connected');
            return mongoose;
        });

    }

    cached.conn = await cached.promise;

    return cached.conn;
}

// ============================
// Auto DB Connect
// ============================
app.use('/api', async (req, res, next) => {

    try {

        await connectDB();

        next();

    } catch (err) {

        console.error(err);

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

        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                message: 'Please fill all fields'
            });
        }

        const existingUser =
            await User.findOne({ email });

        if (existingUser) {

            return res.status(400).json({
                message: 'User already exists'
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const token = jwt.sign(
            {
                user: {
                    id: user._id
                }
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message || 'Server error'
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                message: 'Please fill all fields'
            });
        }

        const user =
            await User.findOne({ email });

        if (!user) {

            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {

            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            {
                user: {
                    id: user._id
                }
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message || 'Server error'
        });
    }
});

// Current User
app.get('/api/auth/me', auth, async (req, res) => {

    try {

        const user =
            await User.findById(req.user.id)
                .select('-password');

        res.json(user);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: error.message || 'Server error'
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

            const fileBuffer =
                req.file.buffer;

            const fileName =
                req.file.originalname.toLowerCase();

            let extractedText = '';

            // TXT
            if (fileName.endsWith('.txt')) {

                extractedText =
                    fileBuffer.toString('utf-8');

            }

            // PDF
            else if (
                fileName.endsWith('.pdf')
            ) {

                const pdfData =
                    await pdfParse(fileBuffer);

                extractedText =
                    pdfData.text;

            }

            // DOCX
            else if (
                fileName.endsWith('.docx')
            ) {

                const result =
                    await mammoth.extractRawText({
                        buffer: fileBuffer
                    });

                extractedText =
                    result.value;

            }

            else {

                return res.status(400).json({
                    message:
                        'Only TXT, PDF and DOCX files are allowed'
                });
            }

            res.json({
                text: extractedText.trim()
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    error.message || 'File processing failed'
            });
        }
    }
);

// ============================
// Home Route
// ============================
app.get('/', (req, res) => {

    res.json({
        message: 'API Running Successfully'
    });
});

// ============================
// 404 Handler
// ============================
app.use((req, res) => {

    res.status(404).json({
        message: 'Route not found'
    });
});

// ============================
// Global Error Handler
// ============================
app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({
        message: err.message || 'Internal Server Error'
    });
});

// ============================
// Start Server
if (require.main === module) {

    app.listen(PORT, async () => {

        try {

            await connectDB();

            console.log('MongoDB Connected');

            console.log(`Server running on port ${PORT}`);

        } catch (err) {

            console.error('MongoDB Connection Error:', err.message);
        }
    });
}

// ============================
// Export
// ============================
module.exports = app;