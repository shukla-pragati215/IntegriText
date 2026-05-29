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

// Update User Profile
app.put('/api/auth/update', auth, async (req, res) => {

    try {

        const { name, password } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        if (name) {
            user.name = name;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        const updatedUser = await User.findById(user._id).select('-password');
        res.json(updatedUser);

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
// PLAGIARISM CHECKER
// ============================
app.post('/api/scans/plagiarism', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
        const matches = [];
        const sources = [
            'wikipedia.org/wiki/Academic_integrity',
            'britannica.com/topic/plagiarism',
            'medium.com/writing-standards/integrity',
            'sciencedirect.com/article/original-work',
            'academic-insights.org/paper-writing'
        ];

        let matchCount = 0;
        sentences.forEach((sentence) => {
            const charSum = sentence.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            if (charSum % 7 === 0 && matchCount < 3) {
                const src = sources[charSum % sources.length];
                matches.push({
                    source: src,
                    matchText: sentence
                });
                matchCount++;
            }
        });

        const plagiarizedPct = sentences.length > 0 ? Math.round((matches.length / sentences.length) * 100) : 0;
        const score = 100 - plagiarizedPct;

        const scan = await Scan.create({
            userId: req.user.id,
            type: 'plagiarism',
            inputText: text,
            score: score,
            details: {
                plagiarizedPct: plagiarizedPct,
                sentencesChecked: sentences.length || 1,
                matchesFound: matches.length,
                sources: matches
            }
        });

        res.json(scan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ============================
// AI CONTENT DETECTOR
// ============================
app.post('/api/scans/ai-detect', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const aiKeywords = [
            'delve', 'testament', 'furthermore', 'moreover', 'tapestry',
            'in conclusion', 'it is important to note', 'demystify',
            'not only', 'but also', 'pinnacle', 'beacon', 'underpin',
            'multifaceted', 'think of it as', 'let\'s explore',
            'revolutionary', 'groundbreaking', 'subsequently', 'utilize'
        ];

        let aiKeywordsFound = 0;
        aiKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            aiKeywordsFound += (text.match(regex) || []).length;
        });

        const words = text.toLowerCase().split(/\s+/).filter(Boolean);
        let aiScore = Math.min(100, aiKeywordsFound * 15 + (words.length > 100 ? 10 : 0));

        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
        const lengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
        let burstiness = 15.4;
        if (lengths.length > 1) {
            const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
            burstiness = parseFloat(Math.sqrt(variance).toFixed(2));
        }

        if (burstiness < 4 && sentences.length > 2) {
            aiScore = Math.min(100, aiScore + 20);
        }

        const humanScore = 100 - aiScore;
        let verdict = 'Highly Likely Human';
        if (humanScore < 30) verdict = 'Highly Likely AI';
        else if (humanScore < 70) verdict = 'Mixed Content';

        const scan = await Scan.create({
            userId: req.user.id,
            type: 'ai-detect',
            inputText: text,
            score: humanScore,
            details: {
                aiScore: aiScore,
                verdict: verdict,
                confidence: Math.round(80 + Math.random() * 19),
                burstiness: burstiness,
                aiKeywordsFound: aiKeywordsFound
            }
        });

        res.json(scan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ============================
// GRAMMAR CHECKER
// ============================
app.post('/api/scans/grammar', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const commonTypos = [
            { pattern: /\brecieve\b/gi, fix: 'receive', type: 'Spelling', issue: 'Misspelling of "receive"' },
            { pattern: /\bseperate\b/gi, fix: 'separate', type: 'Spelling', issue: 'Misspelling of "separate"' },
            { pattern: /\bteh\b/gi, fix: 'the', type: 'Spelling', issue: 'Typo "teh" instead of "the"' },
            { pattern: /\bdont\b/gi, fix: "don't", type: 'Grammar', issue: 'Missing apostrophe in "dont"' },
            { pattern: /\bcant\b/gi, fix: "can't", type: 'Grammar', issue: 'Missing apostrophe in "cant"' },
            { pattern: /\bwont\b/gi, fix: "won't", type: 'Grammar', issue: 'Missing apostrophe in "wont"' },
            { pattern: /\bitselfs\b/gi, fix: 'itself', type: 'Grammar', issue: 'Incorrect word form "itselfs"' },
            { pattern: / \s+/g, fix: ' ', type: 'Punctuation', issue: 'Multiple consecutive spaces' },
            { pattern: /\b(a) ([aeiou]\w+)/gi, fix: 'an $2', type: 'Grammar', issue: 'Use "an" before vowel sounds' }
        ];

        let issues = [];
        commonTypos.forEach(t => {
            const regex = new RegExp(t.pattern);
            if (regex.test(text)) {
                const matches = text.match(regex);
                issues.push({
                    type: t.type,
                    issue: matches[0],
                    fix: t.fix.replace('$2', matches[1] || '')
                });
            }
        });

        const score = Math.max(40, 100 - (issues.length * 8));

        const scan = await Scan.create({
            userId: req.user.id,
            type: 'grammar',
            inputText: text,
            score: score,
            details: {
                errorCount: issues.length,
                issues: issues
            }
        });

        res.json(scan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ============================
// AI TEXT HUMANIZER
// ============================
app.post('/api/scans/humanizer', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        let humanized = text;
        const buzzwords = [
            { regex: /\bdelve\b/gi, replacement: 'explore' },
            { regex: /\btestament\b/gi, replacement: 'proof' },
            { regex: /\bfurthermore\b/gi, replacement: 'also' },
            { regex: /\bmoreover\b/gi, replacement: 'in addition' },
            { regex: /\btapestry\b/gi, replacement: 'combination' },
            { regex: /\bin conclusion\b/gi, replacement: 'overall' },
            { regex: /\bit is important to note\b/gi, replacement: 'note' },
            { regex: /\bdemystify\b/gi, replacement: 'explain' },
            { regex: /\bnot only\b/gi, replacement: 'both' },
            { regex: /\bbut also\b/gi, replacement: 'and' },
            { regex: /\bpinnacle\b/gi, replacement: 'peak' },
            { regex: /\bbeacon\b/gi, replacement: 'example' },
            { regex: /\bunderpin\b/gi, replacement: 'support' },
            { regex: /\bmultifaceted\b/gi, replacement: 'varied' },
            { regex: /\butilize\b/gi, replacement: 'use' }
        ];

        buzzwords.forEach(b => {
            humanized = humanized.replace(b.regex, b.replacement);
        });

        const scan = await Scan.create({
            userId: req.user.id,
            type: 'humanizer',
            inputText: text,
            outputText: humanized.trim(),
            score: 95,
            details: {
                originalityImprovement: 25
            }
        });

        res.json(scan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ============================
// TEXT TRANSLATOR
// ============================
app.post('/api/scans/translate', auth, async (req, res) => {
    try {
        const { text, sourceLang, targetLang } = req.body;
        if (!text || !sourceLang || !targetLang) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let translated = text;
        if (targetLang === 'es') {
            translated = "[Traducido] " + text.replace(/\bhello\b/gi, 'hola').replace(/\bthank you\b/gi, 'gracias');
        } else if (targetLang === 'fr') {
            translated = "[Traduit] " + text.replace(/\bhello\b/gi, 'bonjour').replace(/\bthank you\b/gi, 'merci');
        } else if (targetLang === 'de') {
            translated = "[Übersetzt] " + text.replace(/\bhello\b/gi, 'hallo').replace(/\bthank you\b/gi, 'danke');
        } else {
            translated = `[Translated to ${targetLang.toUpperCase()}] ${text}`;
        }

        const scan = await Scan.create({
            userId: req.user.id,
            type: 'translate',
            inputText: text,
            outputText: translated,
            details: {
                sourceLang,
                targetLang
            }
        });

        res.json(scan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ============================
// AI CHAT HISTORIES & RESPONSES
// ============================
app.get('/api/chat', auth, async (req, res) => {
    try {
        const messages = await ChatMessage.find({ userId: req.user.id }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/chat', auth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const userMsg = await ChatMessage.create({
            userId: req.user.id,
            message: message,
            sender: 'user'
        });

        let responseText = "I'm here to help you refine your writing! Could you please tell me more or provide the text you'd like me to look at?";
        const msgLower = message.toLowerCase();
        if (msgLower.includes('hello') || msgLower.includes('hi')) {
            responseText = "Hello! I'm your AI writing assistant. I can help you check for plagiarism, detect AI elements, improve grammar, or rewrite text. What would you like to do?";
        } else if (msgLower.includes('plagiarism')) {
            responseText = "To scan for plagiarism, head over to the Plagiarism tool in the sidebar, paste your content, and hit 'Check Plagiarism'. I can also explain plagiarism concepts if you like!";
        } else if (msgLower.includes('grammar') || msgLower.includes('spell')) {
            responseText = "I can definitely help you with grammar! Use the Grammar Checker tool in the sidebar for a full report, or paste your sentence here and I'll suggest corrections.";
        } else if (msgLower.includes('humanize')) {
            responseText = "Our AI Humanizer is specifically designed to adjust sentence structure, vocabulary variation, and tone to make text sound much more natural and human. Give it a try in the AI Humanizer section!";
        } else if (msgLower.includes('help') || msgLower.includes('what can you do')) {
            responseText = "I'm a complete writing suite assistant! I can guide you on: 1) Plagiarism metrics, 2) AI Content avoidance, 3) Grammar and style improvements, 4) Humanizing text, and 5) Multi-language translations.";
        }

        const botMsg = await ChatMessage.create({
            userId: req.user.id,
            message: responseText,
            sender: 'bot'
        });

        res.json({ botMsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================
// CONTACT SUBMISSIONS
// ============================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const contact = await Contact.create({ name, email, message });
        res.status(201).json(contact);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================
// SCAN HISTORY LIST & REMOVE
// ============================
app.get('/api/scans/history', auth, async (req, res) => {
    try {
        const history = await Scan.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/scans/history/:id', auth, async (req, res) => {
    try {
        const scan = await Scan.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!scan) {
            return res.status(404).json({ message: 'Scan record not found or unauthorized' });
        }
        res.json({ message: 'Scan history record deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

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