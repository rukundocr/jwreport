const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temporary folder
const { ensureAdmin, ensureAuth } = require('../middleware/auth');
const memberController = require('../controllers/memberController');

router.get('/search', ensureAuth, memberController.searchMembers);

router.get('/', ensureAdmin, memberController.getMembers);
router.post('/', ensureAdmin, memberController.createMember);
router.post('/upload', ensureAdmin, upload.single('csvFile'), memberController.uploadCSV); // CSV Route
router.put('/:id', ensureAdmin, memberController.updateMember);
router.delete('/:id', ensureAdmin, memberController.deleteMember);

module.exports = router;