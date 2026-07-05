const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  matchResumeToJob,
  getUserMatches,
  getMatchById,
  analyzeMatch,
} = require('../controllers/matchController');

const router = express.Router();

router.use(protect);

router.post('/', matchResumeToJob);
router.post('/:id/analyze', analyzeMatch);
router.get('/', getUserMatches);
router.get('/:id', getMatchById);

module.exports = router;