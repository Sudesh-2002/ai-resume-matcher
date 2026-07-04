const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const {
  uploadResume,
  getUserResumes,
  getResumeById,
  deleteResume,
} = require('../controllers/resumeController');

const router = express.Router();

// All resume routes require authentication
router.use(protect);

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/', getUserResumes);
router.get('/:id', getResumeById);
router.delete('/:id', deleteResume);

module.exports = router;