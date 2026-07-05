import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getResumes, uploadResume, extractResume, embedResume, deleteResume } from '../api/resumes';
import { getJobs, createJob, extractJob, embedJob, deleteJob } from '../api/jobs';
import { createMatch, getMatches, analyzeMatch } from '../api/match';
import toast from 'react-hot-toast';
import { Upload, Briefcase, Zap, LogOut, Trash2, FileText, History } from 'lucide-react';
import MatchCard from '../components/MatchCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';

// Upload step labels
const UPLOAD_LABELS = {
  '': 'Upload PDF',
  uploading: 'Uploading...',
  extracting: 'Extracting skills...',
  embedding: 'Generating embedding...',
};

export default function DashboardPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('resumes');

  // Upload state
  const [uploadStep, setUploadStep] = useState(''); // '', 'uploading', 'extracting', 'embedding'
  const uploading = uploadStep !== '';

  // General processing state (for job form, per-resume processing indicator)
  const [processing, setProcessing] = useState('');

  const [jobForm, setJobForm] = useState({ title: '', company: '', rawText: '' });
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [matching, setMatching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setInitialLoading(true);
    try {
      const [r, j, m] = await Promise.all([getResumes(), getJobs(), getMatches()]);
      setResumes(r.data.resumes);
      setJobs(j.data.jobs);
      setMatches(m.data.matches);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so same file can be re-uploaded if needed
    e.target.value = '';

    try {
      const formData = new FormData();
      formData.append('resume', file);

      setUploadStep('uploading');
      const res = await uploadResume(formData);
      const resumeId = res.data.resume.id;

      setUploadStep('extracting');
      toast.success('PDF uploaded — extracting skills...');
      setProcessing(resumeId);
      await extractResume(resumeId);

      setUploadStep('embedding');
      toast.success('Extracted — generating embedding...');
      await embedResume(resumeId);

      toast.success('Resume ready to match!');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadStep('');
      setProcessing('');
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!jobForm.title.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (jobForm.rawText.trim().length < 50) {
      toast.error('Job description is too short — paste the full text');
      return;
    }

    try {
      setProcessing('job');
      const res = await createJob(jobForm);
      const jobId = res.data.job.id;

      toast.success('Job saved — extracting requirements...');
      await extractJob(jobId);

      toast.success('Extracted — generating embedding...');
      await embedJob(jobId);

      toast.success('Job ready to match!');
      setJobForm({ title: '', company: '', rawText: '' });
      setShowJobForm(false);
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    } finally {
      setProcessing('');
    }
  };

  const handleMatch = async () => {
    if (!selectedResume || !selectedJob) {
      toast.error('Select both a resume and a job first');
      return;
    }
    setMatching(true);
    try {
      toast.success('Running vector search match...');
      const res = await createMatch({ resumeId: selectedResume, jobId: selectedJob });

      toast.success('Match complete — generating gap analysis...');
      await analyzeMatch(res.data.match.id);

      toast.success('Gap analysis ready!');
      await fetchAll();
      setActiveTab('matches');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Match failed');
    } finally {
      setMatching(false);
    }
  };

  const handleDeleteResume = async (id) => {
    try {
      await deleteResume(id);
      toast.success('Resume deleted');
      setResumes(prev => prev.filter(r => r._id !== id));
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await deleteJob(id);
      toast.success('Job deleted');
      setJobs(prev => prev.filter(j => j._id !== id));
    } catch {
      toast.error('Delete failed');
    }
  };

  const tabs = [
    { id: 'resumes', label: 'Resumes', count: resumes.length },
    { id: 'jobs', label: 'Jobs', count: jobs.length },
    { id: 'match', label: 'Match' },
    { id: 'matches', label: 'Results', count: matches.length },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">AI Resume Matcher</h1>
          <p className="text-gray-400 text-xs">Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <History size={16} /> History
          </button>
          <button
            onClick={() => { logoutUser(); navigate('/login'); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Resumes Tab ── */}
        {activeTab === 'resumes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Resumes</h2>
              <label
                className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  uploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {uploading
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Upload size={16} />
                }
                {UPLOAD_LABELS[uploadStep]}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {initialLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : resumes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No resumes yet"
                description="Upload a PDF resume to get started. We'll extract your skills and experience automatically."
              />
            ) : (
              <div className="space-y-3">
                {resumes.map(resume => (
                  <div
                    key={resume._id}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-medium text-white">{resume.originalFileName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                        {processing === resume._id && (
                          <span className="ml-2 text-indigo-400 animate-pulse">Processing...</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteResume(resume._id)}
                      className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete resume"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Job Descriptions</h2>
              <button
                onClick={() => setShowJobForm(!showJobForm)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Briefcase size={16} />
                {showJobForm ? 'Cancel' : 'Add Job'}
              </button>
            </div>

            {showJobForm && (
              <form
                onSubmit={handleCreateJob}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
              >
                <h3 className="font-medium text-white">New Job Description</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Full Stack Engineer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Company</label>
                    <input
                      type="text"
                      value={jobForm.company}
                      onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="TechCorp"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Job Description Text *
                    <span className="text-gray-600 ml-1">(paste the full posting)</span>
                  </label>
                  <textarea
                    value={jobForm.rawText}
                    onChange={(e) => setJobForm({ ...jobForm, rawText: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    rows={6}
                    placeholder="Paste the full job description here..."
                  />
                  {jobForm.rawText.length > 0 && jobForm.rawText.length < 50 && (
                    <p className="text-xs text-amber-500 mt-1">
                      Too short — paste the full job description for accurate results
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={processing === 'job'}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {processing === 'job' && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {processing === 'job' ? 'Processing...' : 'Save & Process'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowJobForm(false); setJobForm({ title: '', company: '', rawText: '' }); }}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {initialLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs yet"
                description="Add a job description to match against your resume. Paste the full posting for best results."
              />
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div
                    key={job._id}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-medium text-white">{job.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.company && `${job.company} · `}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteJob(job._id)}
                      className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete job"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Match Tab ── */}
        {activeTab === 'match' && (
          <div className="space-y-6 max-w-lg">
            <h2 className="text-lg font-semibold">Run a Match</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">

              <div>
                <label className="text-sm text-gray-400 block mb-2">Select Resume</label>
                <select
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  disabled={resumes.length === 0}
                >
                  <option value="">-- Choose a resume --</option>
                  {resumes.map(r => (
                    <option key={r._id} value={r._id}>{r.originalFileName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Select Job Description</label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  disabled={jobs.length === 0}
                >
                  <option value="">-- Choose a job --</option>
                  {jobs.map(j => (
                    <option key={j._id} value={j._id}>
                      {j.title}{j.company ? ` — ${j.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleMatch}
                disabled={matching || !selectedResume || !selectedJob}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {matching
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Zap size={16} />
                }
                {matching ? 'Matching...' : 'Run Match + Gap Analysis'}
              </button>

              {resumes.length === 0 && (
                <p className="text-xs text-amber-500 text-center">
                  Upload a resume first from the Resumes tab.
                </p>
              )}
              {resumes.length > 0 && jobs.length === 0 && (
                <p className="text-xs text-amber-500 text-center">
                  Add a job description from the Jobs tab to run a match.
                </p>
              )}

              {/* How it works */}
              <div className="border-t border-gray-800 pt-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">How it works</p>
                <ol className="space-y-1.5">
                  {[
                    'Vector search compares your resume embedding against the job',
                    'Skill overlap score is calculated from required vs your skills',
                    'Groq generates a personalised gap analysis with action steps',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-500">
                      <span className="text-indigo-500 font-medium shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ── Results Tab ── */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Match Results</h2>
              {matches.length > 0 && (
                <button
                  onClick={() => navigate('/history')}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View full history →
                </button>
              )}
            </div>

            {initialLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : matches.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No matches yet"
                description="Go to the Match tab, select a resume and job, then run a match to see your results here."
                action={
                  <button
                    onClick={() => setActiveTab('match')}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Run your first match
                  </button>
                }
              />
            ) : (
              <div className="space-y-4">
                {matches.map(match => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}