const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    sender: { type: String, required: true, enum: ['user', 'bot'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
