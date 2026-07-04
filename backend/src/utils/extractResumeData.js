const groq = require('../config/groq');

const extractResumeData = async (rawText) => {
  const prompt = `You are a resume parser. Extract structured data from the resume text below.

Return ONLY a valid JSON object with exactly this structure — no markdown, no explanation, no code fences:
{
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2022 - Dec 2023",
      "description": "Brief description of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "BSc Computer Science",
      "institution": "University Name",
      "year": "2024"
    }
  ],
  "summary": "A 2-3 sentence professional summary of this candidate"
}

Rules:
- skills: extract ALL technical and soft skills mentioned anywhere in the resume
- experience: list all work experience, internships, and projects
- education: list all degrees and certifications
- summary: write a concise summary based on the resume content
- If a field has no data, use an empty array [] or empty string ""
- Return ONLY the JSON object, nothing else

Resume text:
${rawText}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1, // low temperature for consistent structured output
    max_tokens: 2000,
  });

  const content = completion.choices[0].message.content.trim();

  // Strip markdown code fences if model adds them despite instructions
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  // Validate structure — fill missing fields with defaults
  return {
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
};

module.exports = extractResumeData;