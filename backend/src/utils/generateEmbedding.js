const hf = require('../config/huggingface');

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

// Convert resume structured data into a flat string for embedding
const resumeToText = (structuredData) => {
  const { skills, experience, education, summary } = structuredData;

  const skillsText = skills.length > 0
    ? `Skills: ${skills.join(', ')}`
    : '';

  const experienceText = experience.length > 0
    ? `Experience: ${experience.map(e =>
        `${e.title} at ${e.company} — ${e.description}`
      ).join('. ')}`
    : '';

  const educationText = education.length > 0
    ? `Education: ${education.map(e =>
        `${e.degree} from ${e.institution}`
      ).join(', ')}`
    : '';

  const summaryText = summary ? `Summary: ${summary}` : '';

  return [skillsText, experienceText, educationText, summaryText]
    .filter(Boolean)
    .join('\n');
};

// Convert job description structured data into a flat string for embedding
const jobToText = (structuredData) => {
  const { requiredSkills, preferredSkills, responsibilities, experienceLevel } = structuredData;

  const requiredText = requiredSkills.length > 0
    ? `Required Skills: ${requiredSkills.join(', ')}`
    : '';

  const preferredText = preferredSkills.length > 0
    ? `Preferred Skills: ${preferredSkills.join(', ')}`
    : '';

  const responsibilitiesText = responsibilities.length > 0
    ? `Responsibilities: ${responsibilities.join('. ')}`
    : '';

  const levelText = experienceLevel
    ? `Experience Level: ${experienceLevel}`
    : '';

  return [requiredText, preferredText, responsibilitiesText, levelText]
    .filter(Boolean)
    .join('\n');
};

// Generate embedding vector for any text string
const generateEmbedding = async (text) => {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  });

  // HuggingFace returns a nested array for single inputs — flatten it
  const vector = Array.isArray(result[0]) ? result[0] : result;

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('HuggingFace returned an invalid embedding');
  }

  return vector;
};

module.exports = { generateEmbedding, resumeToText, jobToText };