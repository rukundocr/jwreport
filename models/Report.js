const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    month: { 
        type: String, 
        required: true // e.g., "January"
    },
    year: { 
        type: Number, 
        required: true,
        default: 2026 
    },
    participated: { 
        type: Boolean, 
        default: false 
    },
    hours: { 
        type: Number, 
        default: 0 
    },
    bibleStudies: { 
        type: Number, 
        default: 0 
    },
    remarks: { 
        type: String, 
        trim: true 
    }
}, { timestamps: true });

// Prevent duplicate reports for the same member in the same month/year
ReportSchema.index({ memberId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);