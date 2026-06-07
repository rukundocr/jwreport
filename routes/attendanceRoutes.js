const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// @route   GET /attendance
router.get('/', attendanceController.getAttendancePage);

// @route   GET /attendance/view (keep for legacy/compatibility)
router.get('/view', attendanceController.getAttendancePage);

// @route   GET /attendance/record/:id
router.get('/record/:id', attendanceController.getAttendanceById);

// @route   POST /attendance
router.post('/', attendanceController.submitAttendance);

// @route   POST /attendance/submit
router.post('/submit', attendanceController.submitAttendance);

// @route   POST /attendance/update
router.post('/update', attendanceController.updateAttendance);

// @route   PUT /attendance/:id
router.put('/:id', attendanceController.updateAttendance);

// @route   DELETE /attendance/:id
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;
