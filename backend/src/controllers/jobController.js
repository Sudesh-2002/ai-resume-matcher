const JobDescription = require('../models/JobDescription');
const extractJobData = require('../utils/extractJobData');
const { generateEmbedding, jobToText } = require('../utils/generateEmbedding');

// POST /api/jobs
const createJob = async (req, res) => {
  try {
    const { title, company, rawText } = req.body;

    if (!title || !rawText) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and job description text are required',
      });
    }

    if (rawText.length < 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Job description is too short. Please provide the full text.',
      });
    }

    const job = await JobDescription.create({
      user: req.user._id,
      title,
      company: company || '',
      rawText,
      structuredData: {
        requiredSkills: [],
        preferredSkills: [],
        responsibilities: [],
        experienceLevel: '',
      },
    });

    res.status(201).json({
      status: 'ok',
      message: 'Job description saved successfully',
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        rawTextPreview: rawText.substring(0, 200) + '...',
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('Create job error:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/jobs/:id/extract
const extractStructuredData = async (req, res) => {
  try {
    const job = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job description not found' });
    }

    console.log(`Extracting structured data for job ${job._id}...`);

    const structuredData = await extractJobData(job.rawText);

    job.structuredData = structuredData;
    await job.save();

    res.json({
      status: 'ok',
      message: 'Job structured data extracted successfully',
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        structuredData: job.structuredData,
      },
    });
  } catch (error) {
    console.error('Job extraction error:', error.stack);

    if (error instanceof SyntaxError) {
      return res.status(500).json({
        status: 'error',
        message: 'LLM returned invalid JSON. Try again.',
      });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/jobs
const getUserJobs = async (req, res) => {
  try {
    const jobs = await JobDescription.find({ user: req.user._id })
      .select('-rawText -embedding -structuredData')
      .sort({ createdAt: -1 });

    res.json({ status: 'ok', jobs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const job = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('-embedding');

    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job description not found' });
    }

    res.json({ status: 'ok', job });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/jobs/:id
const deleteJob = async (req, res) => {
  try {
    const job = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job description not found' });
    }

    await job.deleteOne();

    res.json({ status: 'ok', message: 'Job description deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/jobs/:id/embed
const generateJobEmbedding = async (req, res) => {
  try {
    const job = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job description not found' });
    }

    const { requiredSkills, responsibilities } = job.structuredData;
    const hasData = requiredSkills.length > 0 || responsibilities.length > 0;

    if (!hasData) {
      return res.status(400).json({
        status: 'error',
        message: 'Job has no structured data. Run /extract first.',
      });
    }

    console.log(`Generating embedding for job ${job._id}...`);

    const text = jobToText(job.structuredData);
    const embedding = await generateEmbedding(text);

    job.embedding = embedding;
    await job.save();

    res.json({
      status: 'ok',
      message: 'Job embedding generated successfully',
      job: {
        id: job._id,
        title: job.title,
        embeddingDimensions: embedding.length,
        embeddingPreview: embedding.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Job embedding error:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createJob,
  extractStructuredData,
  getUserJobs,
  getJobById,
  deleteJob,
  generateJobEmbedding,
};