const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/integritext';

// Load Models
const User = require('./models/User');
const Scan = require('./models/Scan');
const ChatMessage = require('./models/ChatMessage');
const Contact = require('./models/Contact');

async function showDatabaseData() {
    console.log('Connecting to MongoDB...\n');

    try {
        await mongoose.connect(MONGODB_URI);

        console.log('✓ Connected to Database');
        console.log(`Database URI: ${MONGODB_URI}\n`);

        // ================= USERS =================
        const users = await User.find({}, '-password').lean();

        console.log('================ USERS COLLECTION ================');
        console.log(`Total Users: ${users.length}\n`);

        if (users.length === 0) {
            console.log('No users found.\n');
        } else {
            console.dir(users, {
                depth: null,
                colors: true
            });
        }

        // ================= SCANS =================
        const scans = await Scan.find({})
            .populate('userId', 'name email')
            .lean();

        console.log('\n================ SCANS COLLECTION ================');
        console.log(`Total Scans: ${scans.length}\n`);

        if (scans.length === 0) {
            console.log('No scans found.\n');
        } else {
            scans.forEach((s, index) => {
                console.log(`\n#${index + 1}`);

                console.log(
                    `Type: ${s.type ? s.type.toUpperCase() : 'UNKNOWN'}`
                );

                console.log(
                    `User: ${
                        s.userId?.name || 'Unknown User'
                    }`
                );

                console.log(
                    `Created At: ${
                        s.createdAt
                            ? new Date(s.createdAt).toLocaleString()
                            : 'N/A'
                    }`
                );

                console.log(
                    `Input: "${
                        s.inputText
                            ? s.inputText.substring(0, 80)
                            : 'No Input'
                    }..."`
                );

                if (s.outputText) {
                    console.log(
                        `Output: "${s.outputText.substring(0, 80)}..."`
                    );
                }

                console.log(
                    `Score: ${
                        s.score !== undefined
                            ? s.score
                            : 'N/A'
                    }`
                );

                if (s.details) {
                    console.dir(s.details, {
                        depth: null,
                        colors: true
                    });
                }

                console.log('------------------------------------------------');
            });
        }

        // ================= CHAT MESSAGES =================
        const chats = await ChatMessage.find({})
            .populate('userId', 'name')
            .lean();

        console.log('\n================ CHAT MESSAGES COLLECTION ================');
        console.log(`Total Messages: ${chats.length}\n`);

        if (chats.length === 0) {
            console.log('No chat messages found.\n');
        } else {
            chats.forEach((c) => {
                const time = c.createdAt
                    ? new Date(c.createdAt).toLocaleTimeString()
                    : 'Unknown Time';

                const sender =
                    c.sender === 'user'
                        ? c.userId?.name || 'User'
                        : 'AI Bot';

                console.log(
                    `[${time}] ${sender}: ${c.message || 'No Message'}`
                );
            });
        }

        // ================= CONTACTS =================
        const contacts = await Contact.find({}).lean();

        console.log('\n================ CONTACT MESSAGES COLLECTION ================');
        console.log(
            `Total Contact Submissions: ${contacts.length}\n`
        );

        if (contacts.length === 0) {
            console.log('No contact messages found.\n');
        } else {
            console.dir(contacts, {
                depth: null,
                colors: true
            });
        }

    } catch (err) {
        console.error('\n❌ Database Error');
        console.error(err.message);
    } finally {
        try {
            await mongoose.connection.close();
            console.log('\n✓ Database connection closed.');
        } catch (closeErr) {
            console.error(
                'Error while closing connection:',
                closeErr.message
            );
        }

        process.exit(0);
    }
}

showDatabaseData();