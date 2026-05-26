const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['plagiarism', 'ai-detect', 'grammar', 'humanizer', 'translate'] },
    inputText: { type: String, required: true },
    outputText: { type: String },
    score: { type: Number },
    details: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', ScanSchema);
