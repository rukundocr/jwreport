const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true // Ensure only one meeting record per specific date/time if needed, but per date is safer
    },
    type: {
        type: String,
        enum: ['Weekday', 'Weekend'],
        required: true
    },
    count: {
        type: Number,
        required: true,
        min: 0
    },
    month: {
        type: String,
        required: true // e.g., "March"
    },
    year: {
        type: Number,
        required: true
    }
}, { timestamps: true });

// Index for faster reporting by month/year
AttendanceSchema.index({ month: 1, year: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
