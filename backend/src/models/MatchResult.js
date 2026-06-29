const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    jobDescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobDescription',
      required: true,
    },
    similarityScore: {
      type: Number, // 0-1, raw vector similarity
      required: true,
    },
    overallMatchPercentage: {
      type: Number, // 0-100, final weighted score
      required: true,
    },
    matchedSkills: [String],
    missingSkills: [String],
    gapAnalysis: {
      type: String, // LLM-generated narrative feedback
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MatchResult', matchResultSchema);