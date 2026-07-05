const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const MatchResult = require('../models/MatchResult');
const { generateEmbedding, resumeToText } = require('../utils/generateEmbedding');
const generateGapAnalysis = require('../utils/generateGapAnalysis');

// Calculate skill overlap between resume and job
const calculateSkillScore = (resumeSkills, requiredSkills, preferredSkills) => {
  const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
  const requiredLower = requiredSkills.map(s => s.toLowerCase());
  const preferredLower = preferredSkills.map(s => s.toLowerCase());

  const matchedRequired = requiredLower.filter(s => resumeSkillsLower.includes(s));
  const matchedPreferred = preferredLower.filter(s => resumeSkillsLower.includes(s));
  const missingRequired = requiredLower.filter(s => !resumeSkillsLower.includes(s));

  const requiredScore = requiredLower.length > 0
    ? matchedRequired.length / requiredLower.length
    : 1;

  const preferredScore = preferredLower.length > 0
    ? matchedPreferred.length / preferredLower.length
    : 0;

  // 80% weight on required, 20% on preferred
  const skillScore = (requiredScore * 0.8) + (preferredScore * 0.2);

  return {
    skillScore,
    matchedSkills: [...matchedRequired, ...matchedPreferred],
    missingSkills: missingRequired,
  };
};

// POST /api/match
const matchResumeToJob = async (req, res) => {
  try {
    const { resumeId, jobId } = req.body;

    if (!resumeId || !jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'resumeId and jobId are required',
      });
    }

    // Fetch both documents
    const [resume, job] = await Promise.all([
      Resume.findOne({ _id: resumeId, user: req.user._id }),
      JobDescription.findOne({ _id: jobId, user: req.user._id }),
    ]);

    if (!resume) {
      return res.status(404).json({ status: 'error', message: 'Resume not found' });
    }
    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job description not found' });
    }
    if (!resume.embedding || resume.embedding.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume has no embedding. Run /embed first.',
      });
    }
    if (!job.embedding || job.embedding.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Job has no embedding. Run /embed first.',
      });
    }

    console.log(`Running vector search match: resume ${resumeId} vs job ${jobId}`);

    // Run $vectorSearch using the resume's embedding against job collection
    const vectorResults = await JobDescription.aggregate([
      {
        $vectorSearch: {
          index: 'job_vector_index',
          path: 'embedding',
          queryVector: resume.embedding,
          numCandidates: 10,
          limit: 5,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    // Find the similarity score for our specific job
    const vectorMatch = vectorResults.find(
      r => r._id.toString() === jobId.toString()
    );

    // If specific job not in top results, run reverse search
    // (resume embedding vs job embedding directly via cosine similarity)
    let similarityScore = 0;

    if (vectorMatch) {
      similarityScore = vectorMatch.score;
    } else {
      // Fallback: compute cosine similarity manually
      similarityScore = cosineSimilarity(resume.embedding, job.embedding);
    }

    // Calculate skill-based score
    const { skillScore, matchedSkills, missingSkills } = calculateSkillScore(
      resume.structuredData.skills,
      job.structuredData.requiredSkills,
      job.structuredData.preferredSkills
    );

    // Final weighted score: 60% semantic similarity + 40% skill overlap
    const overallMatchPercentage = Math.round(
      (similarityScore * 0.6 + skillScore * 0.4) * 100
    );

    // Save match result
    const matchResult = await MatchResult.create({
      user: req.user._id,
      resume: resume._id,
      jobDescription: job._id,
      similarityScore: parseFloat(similarityScore.toFixed(4)),
      overallMatchPercentage,
      matchedSkills,
      missingSkills,
      gapAnalysis: '', // filled in Step 9
    });

    res.status(201).json({
      status: 'ok',
      message: 'Match completed successfully',
      match: {
        id: matchResult._id,
        resumeFile: resume.originalFileName,
        jobTitle: job.title,
        jobCompany: job.company,
        similarityScore: matchResult.similarityScore,
        overallMatchPercentage: matchResult.overallMatchPercentage,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
      },
    });
  } catch (error) {
    console.error('Match error:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/match
const getUserMatches = async (req, res) => {
  try {
    const matches = await MatchResult.find({ user: req.user._id })
      .populate('resume', 'originalFileName')
      .populate('jobDescription', 'title company')
      .sort({ createdAt: -1 });

    res.json({ status: 'ok', matches });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/match/:id
const getMatchById = async (req, res) => {
  try {
    const match = await MatchResult.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate('resume', 'originalFileName structuredData')
      .populate('jobDescription', 'title company structuredData');

    if (!match) {
      return res.status(404).json({ status: 'error', message: 'Match not found' });
    }

    res.json({ status: 'ok', match });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Helper: manual cosine similarity (fallback)
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
};

// POST /api/match/:id/analyze
const analyzeMatch = async (req, res) => {
  try {
    const match = await MatchResult.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate('resume')
      .populate('jobDescription');

    if (!match) {
      return res.status(404).json({ status: 'error', message: 'Match not found' });
    }

    console.log(`Generating gap analysis for match ${match._id}...`);

    const gapAnalysis = await generateGapAnalysis({
      resumeData: match.resume.structuredData,
      jobData: match.jobDescription.structuredData,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      overallMatchPercentage: match.overallMatchPercentage,
    });

    match.gapAnalysis = gapAnalysis;
    await match.save();

    res.json({
      status: 'ok',
      message: 'Gap analysis generated successfully',
      match: {
        id: match._id,
        resumeFile: match.resume.originalFileName,
        jobTitle: match.jobDescription.title,
        jobCompany: match.jobDescription.company,
        overallMatchPercentage: match.overallMatchPercentage,
        similarityScore: match.similarityScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        gapAnalysis: match.gapAnalysis,
      },
    });
  } catch (error) {
    console.error('Gap analysis error:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  matchResumeToJob,
  getUserMatches,
  getMatchById,
  analyzeMatch,
};