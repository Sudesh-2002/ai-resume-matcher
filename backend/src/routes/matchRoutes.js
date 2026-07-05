const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  matchResumeToJob,
  getUserMatches,
  getMatchById,
} = require('../controllers/matchController');

const router = express.Router();

router.use(protect);

router.post('/', matchResumeToJob);
router.get('/', getUserMatches);
router.get('/:id', getMatchById);

module.exports = router;