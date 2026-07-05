const fs = require('fs');
const Resume = require('../models/Resume');
const extractPdfText = require('../utils/extractPdfText');
const extractResumeData = require('../utils/extractResumeData');
const { generateEmbedding, resumeToText } = require('../utils/generateEmbedding');

// POST /api/resumes/upload
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    // Extract text from the uploaded PDF
    const rawText = await extractPdfText(req.file.path);

    if (!rawText || rawText.length < 50) {
      // Clean up the file if extraction failed or text is too short
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        status: 'error',
        message: 'Could not extract text from PDF. Make sure it is not a scanned image.',
      });
    }

    // Save to MongoDB
    const resume = await Resume.create({
      user: req.user._id,
      originalFileName: req.file.originalname,
      rawText,
      structuredData: {
        skills: [],
        experience: [],
        education: [],
        summary: '',
      },
    });

    res.status(201).json({
      status: 'ok',
      message: 'Resume uploaded and text extracted successfully',
      resume: {
        id: resume._id,
        originalFileName: resume.originalFileName,
        rawTextPreview: rawText.substring(0, 300) + '...',
        characterCount: rawText.length,
        createdAt: resume.createdAt,
      },
    });
  } catch (error) {
    // Clean up file if something went wrong after upload
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Resume upload error:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/resumes
const getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .select('-rawText -embedding -structuredData')
      .sort({ createdAt: -1 });

    res.json({ status: 'ok', resumes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/resumes/:id
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('-embedding');

    if (!resume) {
      return res.status(404).json({ status: 'error', message: 'Resume not found' });
    }

    res.json({ status: 'ok', resume });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/resumes/:id
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ status: 'error', message: 'Resume not found' });
    }

    await resume.deleteOne();

    res.json({ status: 'ok', message: 'Resume deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/resumes/:id/extract
const extractStructuredData = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ status: 'error', message: 'Resume not found' });
    }

    if (!resume.rawText) {
      return res.status(400).json({ status: 'error', message: 'No raw text found for this resume' });
    }

    console.log(`Extracting structured data for resume ${resume._id}...`);

    const structuredData = await extractResumeData(resume.rawText);

    // Save structured data back to the resume document
    resume.structuredData = structuredData;
    await resume.save();

    res.json({
      status: 'ok',
      message: 'Structured data extracted successfully',
      resume: {
        id: resume._id,
        originalFileName: resume.originalFileName,
        structuredData: resume.structuredData,
      },
    });
  } catch (error) {
    console.error('Extraction error:', error.stack);

    // Handle JSON parse failure from LLM
    if (error instanceof SyntaxError) {
      return res.status(500).json({
        status: 'error',
        message: 'LLM returned invalid JSON. Try again.',
      });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/resumes/:id/embed
const generateResumeEmbedding = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ status: 'error', message: 'Resume not found' });
    }

    const { skills, experience, education, summary } = resume.structuredData;
    const hasData = skills.length > 0 || experience.length > 0 || education.length > 0;

    if (!hasData) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume has no structured data. Run /extract first.',
      });
    }

    console.log(`Generating embedding for resume ${resume._id}...`);

    const text = resumeToText(resume.structuredData);
    const embedding = await generateEmbedding(text);

    resume.embedding = embedding;
    await resume.save();

    res.json({
      status: 'ok',
      message: 'Resume embedding generated successfully',
      resume: {
        id: resume._id,
        originalFileName: resume.originalFileName,
        embeddingDimensions: embedding.length,
        embeddingPreview: embedding.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Resume embedding error:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  uploadResume,
  getUserResumes,
  getResumeById,
  deleteResume,
  extractStructuredData,
  generateResumeEmbedding,
};