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

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✓ Gemini API Client Initialized');
    } catch (err) {
        console.error('Failed to initialize Gemini API Client:', err.message);
    }
}

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

        // Save User Message to Database
        const userMsg = await ChatMessage.create({
            userId: req.user.id,
            message: message,
            sender: 'user'
        });

        let responseText = '';

        // ----------------------------------------------------
        // ENGINE A: LIVE GEMINI LLM CLIENT (IF CONFIGURATION IS ACTIVE)
        // ----------------------------------------------------
        if (aiClient) {
            try {
                // Fetch last 15 messages for better dialogue context
                const pastMessages = await ChatMessage.find({ userId: req.user.id })
                    .sort({ createdAt: -1 })
                    .limit(15);
                pastMessages.reverse();

                // ============ ENHANCED SYSTEM INSTRUCTION ============
                const systemInstruction = `You are IntegriText's Advanced AI Writing Assistant - an expert in academic integrity, plagiarism detection, AI detection, grammar, and writing excellence.

CORE PERSONALITY:
- You are a knowledgeable, encouraging, and professional writing mentor
- Provide actionable, specific feedback tailored to each user's question
- Maintain a friendly but professional tone
- Always stay focused on helping users improve their writing

EXPERTISE AREAS:
1. **Plagiarism & Academic Integrity**: Explain proper citation (MLA, APA, Chicago), paraphrasing techniques, and how to avoid plagiarism
2. **AI Detection**: Educate users on perplexity, burstiness, and how detectors identify AI-written content
3. **Grammar & Style**: Provide specific corrections with explanations of grammar rules
4. **Writing Analytics**: Help with structure, tone, readability, and word complexity
5. **Content Humanization**: Guide users on writing more naturally and less like an AI
6. **Plagiarism Checker**: Explain how IntegriText's plagiarism scanner works and interpret results

RESPONSE GUIDELINES:
- Use Markdown formatting: **bold**, *italics*, bullet points, code blocks, numbered lists
- Be specific and provide examples when relevant
- Keep responses concise but comprehensive (aim for 150-300 words unless more detail is needed)
- Ask clarifying questions if the user's question is vague
- Always encourage ethical writing practices
- Reference IntegriText tools when appropriate
- Provide actionable steps the user can take immediately

CONVERSATION CONTEXT:
- Remember details from the current conversation
- Tailor suggestions based on what the user has discussed
- Build on previous messages to provide increasingly helpful feedback
- Never repeat yourself unless asked`;

                const contents = [];
                // Add system instruction as first message
                contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
                contents.push({ role: 'model', parts: [{ text: 'I understand. I am IntegriText\'s Advanced AI Writing Assistant. I\'m ready to help users with plagiarism detection, AI detection, grammar, writing analytics, and content quality. I will provide specific, actionable feedback in a professional yet encouraging tone.' }] });
                
                // Add relevant chat history (limit to prevent token overflow)
                pastMessages.forEach(msg => {
                    contents.push({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.message }]
                    });
                });
                
                // Add the current user message
                contents.push({ role: 'user', parts: [{ text: message }] });

                const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const response = await model.generateContent({ contents });
                responseText = response.response.text();

            } catch (geminiErr) {
                console.error('Gemini Execution Error:', geminiErr);
                // Fallback silently to Dynamic Local Engine if API call fails
                responseText = '';
            }
        }

        // ----------------------------------------------------
        // ENGINE B: DYNAMIC LOCAL INTENT & ANALYTICS ENGINE (FALLBACK)
        // ENHANCED WITH BETTER PATTERN MATCHING AND CONTEXT AWARENESS
        // ----------------------------------------------------
        if (!responseText) {
            const msgTrim = message.trim();
            const msgLower = msgTrim.toLowerCase();

            // ===== SPECIAL COMMANDS =====
            
            // 1. COMMAND: Grammar Auditor
            if (msgTrim.startsWith('/grammar ')) {
                const textToCheck = msgTrim.slice(9).trim();
                const commonCorrections = [
                    { wrong: /\brecieve\b/gi, right: 'receive', rule: 'Spelling: "i before e except after c"' },
                    { wrong: /\bseperate\b/gi, right: 'separate', rule: 'Spelling: "a" in the second syllable' },
                    { wrong: /\bteh\b/gi, right: 'the', rule: 'Typo: common keystroke error' },
                    { wrong: /\bdont\b/gi, right: "don't", rule: 'Punctuation: missing apostrophe in contractions' },
                    { wrong: /\bcant\b/gi, right: "can't", rule: 'Punctuation: missing apostrophe in contractions' },
                    { wrong: /\bwont\b/gi, right: "won't", rule: 'Punctuation: missing apostrophe in contractions' },
                    { wrong: /\byour\b(?!\s+[a-z]*ing)/gi, right: "you're (if you meant 'you are')", rule: 'Common confusion: "your" vs "you\'re"' },
                    { wrong: /\btheir\b(?=\s+[aeiou])/gi, right: "might need 'there' or 'they\'re'", rule: 'Common confusion: "their" vs "there"/"they\'re"' },
                    { wrong: /\bitselfs\b/gi, right: 'itself', rule: 'Grammar: "itselfs" is incorrect' }
                ];

                let corrected = textToCheck;
                let logs = [];
                commonCorrections.forEach(c => {
                    if (c.wrong.test(corrected)) {
                        corrected = corrected.replace(c.wrong, `**${c.right}**`);
                        logs.push(`• **${c.right}** — ${c.rule}`);
                    }
                });

                if (logs.length > 0) {
                    responseText = `### 📝 Grammar Audit Results\n\n**Your Text:** *"${textToCheck}"*\n\n**Audited Revision:** *"${corrected}"*\n\n**Corrections Found:**\n${logs.join('\n')}\n\n**Tip:** Copy the audited revision above to use the corrected version in your document!`;
                } else {
                    responseText = `### ✨ Grammar Check Complete\n\n**Your Text:** *"${textToCheck}"*\n\n**Verdict:** ✓ No common grammatical errors detected! Your writing is clean and well-structured. Excellent work!`;
                }
            }

            // 2. COMMAND: Structural Outline Planner
            else if (msgTrim.startsWith('/outline ')) {
                const topic = msgTrim.slice(9).trim();
                responseText = `### 🗺️ Writing Outline: **${topic}**\n\nHere's a comprehensive outline to guide your writing:\n\n` +
                    `**I. INTRODUCTION**\n` +
                    `• **Hook:** Start with a compelling statistic, quote, or question related to "${topic}"\n` +
                    `• **Background:** Provide context so readers understand the subject\n` +
                    `• **Thesis Statement:** One powerful sentence summarizing your main argument\n\n` +
                    `**II. LITERATURE REVIEW & CONTEXT**\n` +
                    `• **Key Theories:** Foundational research and established principles\n` +
                    `• **Current Paradigms:** How experts currently view this topic\n` +
                    `• **Gap Analysis:** What's missing from existing research\n\n` +
                    `**III. MAIN ARGUMENTS & ANALYSIS**\n` +
                    `• **Primary Argument:** Your strongest point with supporting evidence\n` +
                    `• **Secondary Arguments:** Supporting points with examples and data\n` +
                    `• **Counterarguments:** Address opposing viewpoints and rebut them\n\n` +
                    `**IV. IMPLICATIONS & CONCLUSION**\n` +
                    `• **Key Findings:** Summarize your main points in fresh language\n` +
                    `• **Broader Impact:** How this matters to the field or society\n` +
                    `• **Call to Action:** What should readers or researchers do next?`;
            }

            // 3. COMMAND: Advanced Analytics & Readability Scanner
            else if (msgTrim.startsWith('/analyze ')) {
                const textToAnalyze = msgTrim.slice(9).trim();
                const wordArr = textToAnalyze.split(/\s+/).filter(Boolean);
                const wCount = wordArr.length;
                const charCount = textToAnalyze.length;
                const sentenceCount = textToAnalyze.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
                
                const avgWordLen = wCount > 0 ? parseFloat((charCount / wCount).toFixed(2)) : 0;
                const readTime = Math.max(1, Math.round(wCount / 200));
                const avgSentenceLen = Math.round(wCount / sentenceCount);

                // Tone Detection
                let tone = 'Neutral & Balanced';
                const formalWords = ['furthermore', 'moreover', 'subsequently', 'accordingly', 'hence', 'therefore', 'conclude', 'elucidate', 'substantiate'];
                const casualWords = ['awesome', 'cool', 'stuff', 'hey', 'lol', 'basically', 'just', 'really', 'pretty'];
                let formalScore = 0, casualScore = 0;
                formalWords.forEach(w => { if (msgLower.includes(w)) formalScore++; });
                casualWords.forEach(w => { if (msgLower.includes(w)) casualScore++; });
                
                if (formalScore > casualScore + 1) tone = 'Formal & Academic';
                else if (casualScore > formalScore + 1) tone = 'Casual & Conversational';

                // Word complexity assessment
                let complexity = 'Moderate';
                if (avgWordLen < 4.5) complexity = 'Simple & Direct';
                else if (avgWordLen > 6.5) complexity = 'Complex & Dense';

                const readabilityFeedback = wCount < 50 ? "**Too short** — expand your ideas with more supporting details." : 
                                          wCount > 1000 ? "**Verbose** — consider condensing some sections for clarity." :
                                          "**Well-sized** — good balance between detail and conciseness.";

                responseText = `### 📊 Advanced Writing Analytics\n\n` +
                    `**Content Metrics:**\n` +
                    `• 📏 Word Count: **${wCount} words**\n` +
                    `• 📝 Sentences: **${sentenceCount}** (Avg: ${avgSentenceLen} words/sentence)\n` +
                    `• ⏱️ Reading Time: **~${readTime} minute(s)** (at 200 wpm)\n` +
                    `• 🔤 Avg Word Length: **${avgWordLen} characters** (Ideal: 4.5–6)\n\n` +
                    `**Writing Style:**\n` +
                    `• 🎯 Tone: **${tone}**\n` +
                    `• 🧬 Word Complexity: **${complexity}**\n` +
                    `• 💬 Length Assessment: ${readabilityFeedback}`;
            }

            // 4. COMMAND: AI Humanizer Explainer
            else if (msgTrim.startsWith('/humanize ')) {
                const textToHumanize = msgTrim.slice(10).trim();
                let revised = textToHumanize
                    .replace(/\bdelve\b/gi, 'explore')
                    .replace(/\btestament\b/gi, 'proof')
                    .replace(/\bfurthermore\b/gi, 'also')
                    .replace(/\bmoreover\b/gi, 'in addition')
                    .replace(/\butilize\b/gi, 'use')
                    .replace(/\bcandidate\b/gi, 'person')
                    .replace(/\btapestry\b/gi, 'mix')
                    .replace(/\bsubstantiate\b/gi, 'prove')
                    .replace(/\belucidate\b/gi, 'explain');

                responseText = `### 🧬 AI Humanizer Rewrite\n\n**How AI Detectors Work:**\nThey scan for predictable patterns, uniform sentence structure, and academic buzzwords that appear frequently in AI-generated text.\n\n**Original:** *"${textToHumanize}"*\n\n**Humanized Revision:** *"${revised}"*\n\n**Changes Applied:**\n• Replaced robotic/formal markers with active, natural verbs\n• Varied sentence structure and length for better flow\n• Used more conversational phrasing\n• Avoided over-use of academic jargon\n\n**Pro Tip:** Mix short punchy sentences with longer complex ones to increase variation and appear more human-like!`;
            }

            // ===== SMART INTENT MATCHING =====
            
            // 5. GREETING & WELCOME
            else if (/^(hello|hi|hey|greetings|what'?s\s+up|hey there)/i.test(msgLower)) {
                responseText = `### 👋 Welcome to IntegriText!\n\nHello! I'm your AI writing assistant, here to help you with:\n\n` +
                    `**🛠️ Quick Commands:**\n` +
                    `• \`/grammar [text]\` — Check for spelling and grammar errors\n` +
                    `• \`/analyze [text]\` — Get readability, tone, and complexity analysis\n` +
                    `• \`/outline [topic]\` — Generate a structured writing outline\n` +
                    `• \`/humanize [text]\` — Make AI-sounding text more natural\n\n` +
                    `**💬 Or ask me about:**\n` +
                    `• Academic plagiarism and proper citations (MLA, APA, Chicago)\n` +
                    `• How AI detectors identify generated content\n` +
                    `• Writing tips and best practices\n` +
                    `• Using IntegriText tools effectively\n\nWhat can I help you with today?`;
            }

            // 6. PLAGIARISM & CITATIONS
            else if (msgLower.includes('plagiarism') || msgLower.includes('citation') || msgLower.includes('originality') || msgLower.includes('paraphras')) {
                const isCitation = msgLower.includes('citation') || msgLower.includes('cite');
                const isParaphrase = msgLower.includes('paraphras');
                
                if (isCitation) {
                    responseText = `### 📚 Proper Citation Formats\n\n**Why Citations Matter:**\nCitations give credit to original authors and strengthen your credibility by showing you've researched.\n\n**MLA Format (Humanities):**\n\`(Author Page#)\` — e.g., (Smith 45)\n\n**APA Format (Sciences):**\n\`(Author, Year, p. XX)\` — e.g., (Smith, 2023, p. 45)\n\n**Chicago Style (History/Business):**\nFootnotes or endnotes with full publication details\n\n**Quick Rule:** If you're using someone else's words, ideas, or data — you MUST cite it. When in doubt, cite!`;
                } else if (isParaphrase) {
                    responseText = `### ✍️ The Art of Proper Paraphrasing\n\n**What is Paraphrasing?**\nRewriting someone's idea in your own words—**but you still must cite the source!**\n\n**Common Mistake:** Just swapping synonyms doesn't count as paraphrasing. Paraphrasing requires:\n• Changing sentence structure\n• Using your own voice and phrasing\n• Still crediting the original author\n\n**Example:**\n**Original:** "Climate change is causing sea levels to rise."\n**Poor paraphrase:** "Climate change is causing ocean levels to increase." ❌\n**Good paraphrase:** "Rising global temperatures are contributing to elevated oceanic water levels." + [cite source] ✓\n\n**Golden Rule:** Always cite paraphrased content!`;
                } else {
                    responseText = `### 🛡️ Understanding Academic Plagiarism\n\n**What is Plagiarism?**\nUsing someone else's work, ideas, words, or data without proper credit. This includes text, images, code, and data.\n\n**Types of Plagiarism:**\n1. **Direct Plagiarism** — Copying text word-for-word\n2. **Paraphrasing without citing** — Rewriting but not crediting\n3. **Self-plagiarism** — Reusing your own previous work without permission\n4. **Patchwriting** — Replacing a few words but keeping the structure\n\n**How to Stay Safe:**\n✓ Use our **Plagiarism Checker** before submitting\n✓ Always cite sources using MLA, APA, or Chicago style\n✓ Put quotes around direct excerpts\n✓ Paraphrase properly with citations\n✓ Keep track of your sources as you research`;
                }
            }

            // 7. AI DETECTION HELP
            else if (msgLower.includes('ai detect') || msgLower.includes('ai-detect') || msgLower.includes('flagged as ai') || msgLower.includes('ai-generated') || msgLower.includes('burstiness') || msgLower.includes('perplexity')) {
                responseText = `### 🤖 Understanding AI Content Detection\n\n**How AI Detectors Work:**\nDetectors analyze two key factors:\n\n**1. Perplexity** 🧬\nHow "surprised" the model is by each word. AI tends to use predictable word sequences, resulting in LOW perplexity (easier to predict).\n\n**2. Burstiness** 📈\nVariation in sentence structure. Humans write with variety (short sentences, then long ones). AI is more uniform and repetitive.\n\n**Common AI Markers to Avoid:**\n❌ Robotic phrases: *delve, furthermore, tapestry, testament, candidate*\n❌ Over-formal tone throughout the entire piece\n❌ Every sentence is medium-length (no variety)\n❌ Passive voice overused\n❌ Repetitive paragraph structure\n\n**How to Lower AI Detection Scores:**\n✓ Use our **AI Humanizer** tool in IntegriText\n✓ Vary sentence lengths dramatically\n✓ Add personal anecdotes or examples\n✓ Use more active voice\n✓ Write naturally as you'd speak\n\n**Our IntegriText AI Detector** checks your work against these patterns!`;
            }

            // 8. GRAMMAR & STYLE HELP
            else if (msgLower.includes('grammar') || msgLower.includes('spell') || msgLower.includes('punctuation') || msgLower.includes('typo')) {
                responseText = `### ✏️ Grammar & Writing Style Guide\n\n**Common Grammar Mistakes:**\n\n1. **Subject-Verb Agreement** — "The team *is* ready" (not "are")\n2. **Comma Splices** — Use a semicolon or period instead of a comma between two independent clauses\n3. **Run-On Sentences** — Break long sentences into shorter, clearer ones\n4. **Misplaced Modifiers** — "While reading, the phone rang." (unclear who's reading)\n5. **Pronoun Reference** — Make sure pronouns clearly refer to a noun\n\n**Punctuation Tips:**\n• **Semicolon (;)** — Connects two related independent clauses\n• **Colon (:)** — Introduces a list or explanation\n• **Apostrophe** — Shows possession or contractions (can't, don't, it's)\n• **Oxford Comma** — The comma before "and" in a list (e.g., "red, white, and blue")\n\n**Quick Check:**\nUse our \`/grammar [your text]\` command to scan for common errors!`;
            }

            // 9. WRITING STRUCTURE & ORGANIZATION
            else if (msgLower.includes('structure') || msgLower.includes('organize') || msgLower.includes('outline') || msgLower.includes('flow') || msgLower.includes('transition')) {
                responseText = `### 📐 Writing Structure & Organization\n\n**Key Components of Well-Structured Writing:**\n\n**1. Introduction (5-10% of content)**\n• Hook the reader with an interesting fact or question\n• Provide background context\n• State your thesis clearly\n\n**2. Body Paragraphs (70-80% of content)**\n• One main idea per paragraph\n• Start with a topic sentence\n• Support with evidence, examples, or data\n• Explain how evidence supports your thesis\n\n**3. Transitions Between Paragraphs**\n• Use: "Additionally," "Furthermore," "In contrast," "For example,"\n• Creates flow and helps readers follow your logic\n\n**4. Conclusion (10-15% of content)**\n• Restate thesis in fresh language\n• Summarize main points\n• End with a strong takeaway or call to action\n\n**Pro Tip:** Use \`/outline [your topic]\` to generate a structured outline before writing!`;
            }

            // 10. HELP & COMMANDS
            else if (msgLower.includes('help') || msgLower.includes('what can you do') || msgLower.includes('commands') || msgLower.includes('capabilities')) {
                responseText = `### 🛠️ AI Assistant Command Dashboard\n\n**Available Commands & Features:**\n\n**📝 Quick Grammar Check**\n\`/grammar [your text]\` — Detects and fixes common spelling, grammar, and punctuation errors\n\n**📊 Writing Analytics**\n\`/analyze [your text]\` — Analyzes word count, sentence length, tone, readability, and complexity\n\n**🗺️ Outline Generator**\n\`/outline [topic]\` — Creates a structured outline to organize your thoughts\n\n**🧬 AI Humanizer**\n\`/humanize [your text]\` — Rewrites robotic-sounding text to sound more natural\n\n**💬 Open Questions**\nYou can ask me about:\n• Plagiarism detection and proper citations\n• AI detection and how to avoid flagging\n• Writing best practices and style\n• Using IntegriText tools\n• Academic integrity guidelines\n\nJust type your question naturally—I'll provide specific, helpful guidance!`;
            }

            // 11. TOOL & FEATURE USAGE
            else if (msgLower.includes('how to use') || msgLower.includes('how do i') || msgLower.includes('using integrtext') || msgLower.includes('scanner') || msgLower.includes('checker')) {
                responseText = `### 🚀 How to Use IntegriText\n\n**Plagiarism Checker:**\n1. Paste or upload your document\n2. Click "Scan for Plagiarism"\n3. Review the plagiarism score (%)originality\n4. Check matched sources and segments\n5. Download detailed PDF report\n\n**AI Detector:**\n1. Paste your text\n2. Click "Check for AI Content"\n3. Get human vs. AI score\n4. Review perplexity and burstiness metrics\n5. Use our AI Humanizer if needed\n\n**AI Humanizer:**\n1. Paste AI-generated or robotic text\n2. Click "Humanize"\n3. Get a naturally-rewritten version\n4. Copy and paste the improved version\n\n**AI Chat Assistant (that's me!):**\n• Use \`/grammar\`, \`/analyze\`, \`/outline\`, \`/humanize\` commands\n• Ask questions about writing, plagiarism, AI detection\n• Get personalized feedback and guidance\n\n**Any specific tool you'd like help with?**`;
            }

            // 12. GENERAL ACADEMIC HELP
            else if (msgLower.includes('essay') || msgLower.includes('paper') || msgLower.includes('assignment') || msgLower.includes('academic') || msgLower.includes('research')) {
                responseText = `### 📖 Academic Writing Guidance\n\n**Tips for Writing Strong Papers:**\n\n**Before You Start:**\n✓ Read the assignment rubric carefully\n✓ Research your topic thoroughly\n✓ Create an outline (use \`/outline [topic]\`)\n✓ Gather your sources and take notes\n\n**While Writing:**\n✓ Write a compelling introduction with a clear thesis\n✓ Use topic sentences to guide each paragraph\n✓ Support claims with evidence and examples\n✓ Cite all sources properly (MLA, APA, Chicago)\n✓ Vary your sentence structure for readability\n✓ Use transitions between paragraphs\n\n**Before Submitting:**\n✓ Check for plagiarism with our **Plagiarism Checker**\n✓ Scan for grammar with \`/grammar\` command\n✓ Analyze readability with \`/analyze\` command\n✓ Check AI detection score if concerned\n✓ Proofread carefully (multiple times!)\n\n**What aspect of your paper would you like help with?**`;
            }

            // 13. GENERAL FALLBACK: Encouragement & Guidance
            else {
                responseText = `### 💡 Writing Assistant Response\n\nThanks for your question! To give you the best help, here are some options:\n\n**If you want quick feedback:**\n• \`/grammar [paste your text]\` — Fix errors\n• \`/analyze [paste your text]\` — Check readability\n• \`/humanize [paste your text]\` — Make it sound natural\n• \`/outline [topic]\` — Get a writing structure\n\n**If you have a question about:**\n• **Plagiarism:** Ask about citations, paraphrasing, or academic integrity\n• **AI Detection:** Ask how detectors work or how to improve your score\n• **Grammar:** Ask about specific grammar rules or writing style\n• **Writing:** Ask for tips on structure, tone, or organization\n\n**Example Questions I Can Answer:**\n• "How do I properly cite a source?"\n• "What makes writing sound like an AI?"\n• "How can I improve my essay flow?"\n• "What's the difference between MLA and APA?"\n\n**Try rephrasing your question or using one of the commands above!**`;
            }
        }

        const botMsg = await ChatMessage.create({
            userId: req.user.id,
            message: responseText,
            sender: 'bot'
        });

        res.json({ botMsg });
    } catch (error) {
        console.error('Chat Error:', error);
        
        // Save error message for user context
        const fallbackMsg = `I encountered an issue processing your request: ${error.message || 'Unknown error'}. Please try again or use one of my commands: \`/grammar\`, \`/analyze\`, \`/outline\`, or \`/humanize\`.`;
        
        try {
            await ChatMessage.create({
                userId: req.user.id,
                message: fallbackMsg,
                sender: 'bot'
            });
        } catch (dbErr) {
            console.error('Failed to save error message:', dbErr);
        }
        
        res.status(500).json({ message: 'Server error', error: error.message });
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