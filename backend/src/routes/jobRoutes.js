const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createJob,
  extractStructuredData,
  getUserJobs,
  getJobById,
  deleteJob,
  generateJobEmbedding,
} = require('../controllers/jobController');

const router = express.Router();

router.use(protect);

router.post('/', createJob);
router.post('/:id/extract', extractStructuredData);
router.post('/:id/embed', generateJobEmbedding);
router.get('/', getUserJobs);
router.get('/:id', getJobById);
router.delete('/:id', deleteJob);

module.exports = router;