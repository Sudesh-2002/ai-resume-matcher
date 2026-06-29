const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      trim: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    structuredData: {
      requiredSkills: [String],
      preferredSkills: [String],
      responsibilities: [String],
      experienceLevel: String,
    },
    embedding: {
      type: [Number],
      default: undefined, // populated in Step 7
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobDescription', jobDescriptionSchema);