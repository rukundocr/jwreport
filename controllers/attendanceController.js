const Attendance = require('../models/Attendance');

// @desc    Show the unified attendance page with tabs
exports.getAttendancePage = async (req, res) => {
    try {
        const selectedMonth = req.query.month || new Date().toLocaleString('default', { month: 'long' });
        const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
        const activeTab = req.query.tab || 'report'; 

        const rawRecords = await Attendance.find({
            month: selectedMonth,
            year: selectedYear
        }).sort({ date: 1 }).lean();

        // Format dates for display
        const records = rawRecords.map(r => ({
            ...r,
            _id: r._id.toString(),
            displayDate: new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            isoDate: new Date(r.date).toISOString().split('T')[0], // For the edit form
            createdDate: new Date(r.createdAt).toLocaleDateString()
        }));

        // Calculate Averages
        let weekdayTotal = 0;
        let weekdayCount = 0;
        let weekendTotal = 0;
        let weekendCount = 0;

        records.forEach(r => {
            if (r.type === 'Weekday') {
                weekdayTotal += r.count;
                weekdayCount++;
            } else if (r.type === 'Weekend') {
                weekendTotal += r.count;
                weekendCount++;
            }
        });

        const summary = {
            weekdayAvg: weekdayCount > 0 ? (weekdayTotal / weekdayCount).toFixed(1) : 0,
            weekendAvg: weekendCount > 0 ? (weekendTotal / weekendCount).toFixed(1) : 0,
            totalRecords: records.length
        };

        const today = new Date().toISOString().split('T')[0];

        res.render('attendance', {
            records,
            summary,
            selectedMonth,
            selectedYear,
            activeTab,
            today,
            activeAttendance: true,
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        });
    } catch (err) {
        console.error("View Attendance Error:", err);
        res.status(500).send("Error loading attendance page");
    }
};

// @desc    Handle attendance submission
exports.submitAttendance = async (req, res) => {
    try {
        const { date, type, count } = req.body;

        if (!date || !type || count === undefined || isNaN(count) || count < 0) {
            return res.redirect('/attendance?tab=record&error=invalid_data');
        }

        const attendanceDate = new Date(date);
        const month = attendanceDate.toLocaleString('default', { month: 'long' });
        const year = attendanceDate.getFullYear();

        await Attendance.findOneAndUpdate(
            { date: attendanceDate },
            {
                date: attendanceDate,
                type,
                count: parseInt(count),
                month,
                year
            },
            { upsert: true, new: true }
        );

        res.redirect('/attendance?tab=report&month=' + month + '&year=' + year);
    } catch (err) {
        console.error("Attendance Submission Error:", err);
        res.redirect('/attendance?tab=record&error=failed');
    }
};

// @desc    Update attendance record
exports.updateAttendance = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;
        const { date, type, count } = req.body;

        if (!id || !date || !type || count === undefined || isNaN(count) || count < 0) {
            return res.redirect('/attendance?tab=report&error=invalid_data');
        }

        const attendanceDate = new Date(date);
        const month = attendanceDate.toLocaleString('default', { month: 'long' });
        const year = attendanceDate.getFullYear();

        await Attendance.findByIdAndUpdate(id, {
            date: attendanceDate,
            type,
            count: parseInt(count),
            month,
            year
        });

        res.redirect(`/attendance?tab=report&month=${month}&year=${year}`);
    } catch (err) {
        console.error("Update Attendance Error:", err);
        res.redirect('/attendance?tab=report&error=update_failed');
    }
};

// @desc    Get attendance record by ID for AJAX pre-filling
exports.getAttendanceById = async (req, res) => {
    try {
        const record = await Attendance.findById(req.params.id).lean();
        if (!record) {
            return res.status(404).json({ message: "Record not found" });
        }
        
        // Ensure date is in YYYY-MM-DD format for <input type="date">
        record.isoDate = new Date(record.date).toISOString().split('T')[0];
        
        res.json(record);
    } catch (err) {
        console.error("Get Attendance ID Error:", err);
        res.status(500).json({ message: "Error fetching record" });
    }
};

// @desc    Delete attendance record
exports.deleteAttendance = async (req, res) => {
    try {
        const record = await Attendance.findByIdAndDelete(req.params.id);
        const month = record ? record.month : new Date().toLocaleString('default', { month: 'long' });
        const year = record ? record.year : new Date().getFullYear();
        
        res.redirect(`/attendance?tab=report&month=${month}&year=${year}&deleted=success`);
    } catch (err) {
        console.error("Delete Attendance Error:", err);
        res.status(500).send("Error deleting record");
    }
};
