const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/integritext';

// Load Models
const User = require('./models/User');
const Scan = require('./models/Scan');
const ChatMessage = require('./models/ChatMessage');
const Contact = require('./models/Contact');

async function showDatabaseData() {
    console.log('Connecting to MongoDB...');
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to Database:', MONGODB_URI);

        // 1. Users count and list
        const users = await User.find({}, '-password').lean();
        console.log('\n================ USERS COLLECTION ================');
        console.log(`Total Users: ${users.length}`);
        console.dir(users, { depth: null, colors: true });

        // 2. Scans count and list
        const scans = await Scan.find({}).populate('userId', 'name email').lean();
        console.log('\n================ SCANS COLLECTION ================');
        console.log(`Total Scans: ${scans.length}`);
        scans.forEach(s => {
            console.log(`\n- [${s.type.toUpperCase()}] by ${s.userId ? s.userId.name : 'Unknown User'} at ${s.createdAt}`);
            console.log(`  Input (trimmed): "${s.inputText.substring(0, 80)}..."`);
            if (s.outputText) console.log(`  Output (trimmed): "${s.outputText.substring(0, 80)}..."`);
            console.log(`  Score: ${s.score !== undefined ? s.score : 'N/A'}`);
            console.dir(s.details, { depth: null, colors: true });
        });

        // 3. Chat Messages count and list
        const chats = await ChatMessage.find({}).populate('userId', 'name').lean();
        console.log('\n================ CHAT MESSAGES COLLECTION ================');
        console.log(`Total Messages: ${chats.length}`);
        chats.forEach(c => {
            console.log(`[${c.createdAt.toLocaleTimeString()}] ${c.sender === 'user' ? (c.userId ? c.userId.name : 'User') : 'AI Bot'}: ${c.message}`);
        });

        // 4. Contact messages count and list
        const contacts = await Contact.find({}).lean();
        console.log('\n================ CONTACT MESSAGES COLLECTION ================');
        console.log(`Total Contact Submissions: ${contacts.length}`);
        console.dir(contacts, { depth: null, colors: true });

    } catch (err) {
        console.error('Database connection or query failed:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
        process.exit(0);
    }
}

showDatabaseData();
