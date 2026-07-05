# AI Resume Matcher

An AI-powered full-stack web application that semantically matches resumes to job descriptions using vector embeddings and LLM-generated gap analysis.

**Live Demo:** [ai-resume-matcher-psi-five.vercel.app](https://ai-resume-matcher-psi-five.vercel.app)  
**Backend API:** [ai-resume-matcher-backend-cv60.onrender.com](https://ai-resume-matcher-backend-cv60.onrender.com/api/health)

---

## What it does

1. **Upload a resume** (PDF) — text is extracted and sent to Groq LLaMA-3.3-70b to produce structured JSON (skills, experience, education, summary)
2. **Add a job description** (paste text) — same LLM pipeline extracts required skills, responsibilities, and experience level
3. **Run a match** — both documents are converted to 384-dimension vector embeddings (HuggingFace `all-MiniLM-L6-v2`) and compared using MongoDB Atlas Vector Search (`$vectorSearch` aggregation)
4. **Get a score + gap analysis** — a weighted score (60% semantic similarity + 40% skill overlap) and a Groq-generated career coaching narrative with strengths, gaps, recommendations, and verdict

---

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Recharts (radar chart visualisation)
- React Router v6
- Axios

### Backend
- Node.js + Express 4
- MongoDB Atlas + Mongoose
- **Atlas Vector Search** (`$vectorSearch`) for semantic matching
- **Groq** (LLaMA-3.3-70b) for structured extraction and gap analysis
- **HuggingFace Inference API** (`sentence-transformers/all-MiniLM-L6-v2`) for embeddings
- JWT authentication
- Multer + pdf-parse for PDF handling
- bcryptjs for password hashing

### Infrastructure
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas (M0 free tier)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│         (Vercel — ai-resume-matcher.vercel.app)  │
└────────────────────┬────────────────────────────┘
                     │ HTTPS / REST API
┌────────────────────▼────────────────────────────┐
│              Express Backend (Render)            │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Auth   │  │  Resume  │  │  Job / Match  │  │
│  │  Routes  │  │  Routes  │  │    Routes     │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │           External AI Services           │    │
│  │  Groq LLaMA-3.3-70b  │  HuggingFace STT │    │
│  └──────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────┘
                     │ mongoose / $vectorSearch
┌────────────────────▼────────────────────────────┐
│           MongoDB Atlas (M0 Free Tier)           │
│                                                  │
│  collections: users, resumes,                    │
│               jobdescriptions, matchresults      │
│                                                  │
│  Vector Search indexes:                          │
│    resume_vector_index   (384-dim, cosine)       │
│    job_vector_index      (384-dim, cosine)       │
└─────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

**Why MongoDB Atlas Vector Search?**  
Native vector search inside MongoDB avoids managing a separate vector database (Pinecone, Weaviate, etc.). The `$vectorSearch` aggregation stage runs directly on the same documents that hold the structured data, keeping the architecture simple and the infra cost at zero on the free tier.

**Why `all-MiniLM-L6-v2` for embeddings?**  
Purpose-built for semantic similarity tasks (not general text generation), produces compact 384-dimension vectors, and runs free via the HuggingFace Inference API. OpenAI `text-embedding-3-small` is a drop-in alternative if higher accuracy is needed.

**Why a weighted score instead of raw cosine similarity?**  
Cosine similarity alone can miss exact keyword requirements (e.g. "must know Docker"). The 60/40 weighting (semantic + explicit skill overlap) produces scores that better match human recruiter judgement — a candidate who matches semantically but lacks every required skill scores lower than pure vector similarity would suggest.

**Why Groq for LLM calls?**  
Sub-second inference on LLaMA-3.3-70b. Structured extraction and gap analysis complete in 2–5 seconds total, which is acceptable for a portfolio demo without streaming or queuing infrastructure.

---

## Local Development

### Prerequisites
- Node.js v20+ (v24 tested)
- MongoDB Atlas account (free M0 cluster)
- Groq API key ([console.groq.com](https://console.groq.com))
- HuggingFace token ([huggingface.co](https://huggingface.co/settings/tokens))

### Setup

```bash
git clone https://github.com/Sudesh-2002/ai-resume-matcher.git
cd ai-resume-matcher
```

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
# Create frontend/.env with VITE_API_URL=http://localhost:5000/api
npm run dev
```

Visit `http://localhost:5173`

### Environment Variables

**Backend `.env`:**
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
GROQ_API_KEY=...
HUGGINGFACE_API_KEY=...
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:5000/api
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |
| POST | `/api/resumes/upload` | ✓ | Upload PDF resume |
| POST | `/api/resumes/:id/extract` | ✓ | LLM structured extraction |
| POST | `/api/resumes/:id/embed` | ✓ | Generate vector embedding |
| GET | `/api/resumes` | ✓ | List user's resumes |
| DELETE | `/api/resumes/:id` | ✓ | Delete resume |
| POST | `/api/jobs` | ✓ | Create job description |
| POST | `/api/jobs/:id/extract` | ✓ | LLM structured extraction |
| POST | `/api/jobs/:id/embed` | ✓ | Generate vector embedding |
| GET | `/api/jobs` | ✓ | List user's jobs |
| DELETE | `/api/jobs/:id` | ✓ | Delete job |
| POST | `/api/match` | ✓ | Run vector search match |
| POST | `/api/match/:id/analyze` | ✓ | Generate gap analysis |
| GET | `/api/match` | ✓ | List match history |
| GET | `/api/match/:id` | ✓ | Get match detail |
| DELETE | `/api/match/:id` | ✓ | Delete match |

---

## Project Structure

```
ai-resume-matcher/
├── backend/
│   └── src/
│       ├── config/        # DB, Groq, HuggingFace, Multer
│       ├── controllers/   # auth, resume, job, match
│       ├── middleware/    # authMiddleware, validateRequest
│       ├── models/        # User, Resume, JobDescription, MatchResult
│       ├── routes/        # authRoutes, resumeRoutes, jobRoutes, matchRoutes
│       ├── utils/         # extractPdfText, extractResumeData, extractJobData,
│       │                  # generateEmbedding, generateGapAnalysis, generateToken
│       └── server.js
└── frontend/
    └── src/
        ├── api/           # axios instance + auth, resumes, jobs, match helpers
        ├── components/    # MatchCard, ErrorBoundary, ui/Skeleton, ui/Button
        ├── context/       # AuthContext
        └── pages/         # LoginPage, RegisterPage, DashboardPage, HistoryPage
```

---

## Roadmap / Possible Extensions

- [ ] Cloudinary integration for persistent PDF storage
- [ ] Per-experience-entry embeddings for more granular matching
- [ ] Resume improvement suggestions (rewrite weak bullet points)
- [ ] Job scraper integration (paste a URL instead of text)
- [ ] Batch matching (one resume vs multiple jobs at once)
- [ ] Export match report as PDF

---

## Author

**Sudesh Hansika**
[GitHub](https://github.com/Sudesh-2002) · [LinkedIn](https://linkedin.com/in/sudesh-hansika-4a9794320)