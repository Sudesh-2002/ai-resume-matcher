const mongoose = require('mongoose');

const experienceEntrySchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    duration: String,
    description: String,
  },
  { _id: false }
);

const educationEntrySchema = new mongoose.Schema(
  {
    degree: String,
    institution: String,
    year: String,
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    structuredData: {
      skills: [String],
      experience: [experienceEntrySchema],
      education: [educationEntrySchema],
      summary: String,
    },
    embedding: {
      type: [Number],
      default: undefined, // populated in Step 7
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);