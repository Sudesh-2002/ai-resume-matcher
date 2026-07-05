const groq = require('../config/groq');

const generateGapAnalysis = async ({
  resumeData,
  jobData,
  matchedSkills,
  missingSkills,
  overallMatchPercentage,
}) => {
  const prompt = `You are a professional career coach and resume expert. Analyze the match between a candidate's resume and a job description, then provide clear, actionable feedback.

CANDIDATE PROFILE:
- Skills: ${resumeData.skills.join(', ')}
- Experience: ${resumeData.experience.map(e => `${e.title} at ${e.company}`).join(', ')}
- Education: ${resumeData.education.map(e => `${e.degree} from ${e.institution}`).join(', ')}
- Summary: ${resumeData.summary}

JOB REQUIREMENTS:
- Required Skills: ${jobData.requiredSkills.join(', ')}
- Preferred Skills: ${jobData.preferredSkills.join(', ')}
- Responsibilities: ${jobData.responsibilities.join(', ')}
- Experience Level: ${jobData.experienceLevel}

MATCH ANALYSIS:
- Overall Match: ${overallMatchPercentage}%
- Matched Skills: ${matchedSkills.join(', ') || 'none'}
- Missing Required Skills: ${missingSkills.join(', ') || 'none'}

Write a gap analysis with exactly these four sections. Be specific, honest, and actionable. Use plain text only — no markdown, no bullet symbols, no asterisks:

STRENGTHS: Write 2-3 sentences about what the candidate does well for this role.

GAPS: Write 2-3 sentences about the most critical missing skills or experience. Be direct.

RECOMMENDATIONS: Write 3-4 specific actions the candidate should take to improve their match (e.g. learn X, build a project with Y, get certified in Z).

VERDICT: Write 1-2 sentences summarising whether the candidate should apply now or upskill first.`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
  });

  return completion.choices[0].message.content.trim();
};

module.exports = generateGapAnalysis;