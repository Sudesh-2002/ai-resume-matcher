const groq = require('../config/groq');

const extractJobData = async (rawText) => {
  const prompt = `You are a job description parser. Extract structured data from the job description below.

Return ONLY a valid JSON object with exactly this structure — no markdown, no explanation, no code fences:
{
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1", "skill2"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "experienceLevel": "Entry/Junior/Mid/Senior/Lead"
}

Rules:
- requiredSkills: skills explicitly marked as required, must-have, or essential
- preferredSkills: skills marked as preferred, nice-to-have, or bonus
- responsibilities: key duties and tasks listed in the job description
- experienceLevel: infer from years of experience required or seniority language used
- If a field has no data, use an empty array [] or empty string ""
- Return ONLY the JSON object, nothing else

Job description:
${rawText}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1500,
  });

  const content = completion.choices[0].message.content.trim();

  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  return {
    requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
    preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
    responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
    experienceLevel: typeof parsed.experienceLevel === 'string' ? parsed.experienceLevel : '',
  };
};

module.exports = extractJobData;