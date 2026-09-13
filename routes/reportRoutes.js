const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

// Route to display the form for a specific group
router.get('/submit', ensureAuth, reportController.getReportingForm);

// Route to handle the POST data from the form
router.post('/submit-bulk', ensureAuth, reportController.submitBulkReports);

// Route to view the saved reports (The page you'll be redirected to)
router.get('/view', ensureAuth, reportController.viewReports);
// Add this to your existing report routes file
router.get('/individual/:memberId', ensureAuth, reportController.getIndividualReport);
// Add this ABOVE the :memberId route to avoid conflicts
router.get('/individual/main', ensureAuth, reportController.getInitialIndividualReport);

// Route to update multiple monthly reports at once
router.post('/individual/:memberId/bulk-update', ensureAuth, reportController.updateIndividualBulkReports);

// Route to update a report manually
router.post('/update', ensureAuth, reportController.updateReport);

// Route for Annual Group Overview
router.get('/annual-overview', ensureAuth, reportController.getAnnualOverview);

module.exports = router;