const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const {
  uploadResume,
  getUserResumes,
  getResumeById,
  deleteResume,
  extractStructuredData,
} = require('../controllers/resumeController');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('resume'), uploadResume);
router.post('/:id/extract', extractStructuredData);  // new
router.get('/', getUserResumes);
router.get('/:id', getResumeById);
router.delete('/:id', deleteResume);

module.exports = router;