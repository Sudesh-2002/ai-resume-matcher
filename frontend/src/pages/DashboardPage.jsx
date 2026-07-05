import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getResumes, uploadResume, extractResume, embedResume, deleteResume } from '../api/resumes';
import { getJobs, createJob, extractJob, embedJob, deleteJob } from '../api/jobs';
import { createMatch, getMatches } from '../api/match';
import toast from 'react-hot-toast';
import { Upload, Briefcase, Zap, LogOut, Trash2, FileText, History } from 'lucide-react';
import MatchCard from '../components/MatchCard';

export default function DashboardPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('resumes');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState('');
  const [jobForm, setJobForm] = useState({ title: '', company: '', rawText: '' });
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [r, j, m] = await Promise.all([getResumes(), getJobs(), getMatches()]);
      setResumes(r.data.resumes);
      setJobs(j.data.jobs);
      setMatches(m.data.matches);
    } catch {
      toast.error('Failed to load data');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await uploadResume(formData);
      const resumeId = res.data.resume.id;
      toast.success('PDF uploaded — extracting...');

      setProcessing(resumeId);
      await extractResume(resumeId);
      toast.success('Extracted — generating embedding...');
      await embedResume(resumeId);
      toast.success('Resume ready!');

      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProcessing('');
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      setProcessing('job');
      const res = await createJob(jobForm);
      const jobId = res.data.job.id;
      toast.success('Job saved — extracting...');
      await extractJob(jobId);
      toast.success('Extracted — generating embedding...');
      await embedJob(jobId);
      toast.success('Job ready!');
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
      // Import analyzeMatch
      const { analyzeMatch } = await import('../api/match');
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
      await fetchAll();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await deleteJob(id);
      toast.success('Job deleted');
      await fetchAll();
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

        {/* Resumes Tab */}
        {activeTab === 'resumes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Resumes</h2>
              <label className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={16} />
                {uploading ? 'Processing...' : 'Upload PDF'}
                <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>
            {resumes.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p>No resumes yet. Upload a PDF to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map(resume => (
                  <div key={resume._id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{resume.originalFileName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(resume.createdAt).toLocaleDateString()}
                        {processing === resume._id && (
                          <span className="ml-2 text-indigo-400">Processing...</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteResume(resume._id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Job Descriptions</h2>
              <button
                onClick={() => setShowJobForm(!showJobForm)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Briefcase size={16} />
                Add Job
              </button>
            </div>

            {showJobForm && (
              <form onSubmit={handleCreateJob} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
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
                      required
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
                  <label className="text-xs text-gray-400 block mb-1">Job Description Text *</label>
                  <textarea
                    value={jobForm.rawText}
                    onChange={(e) => setJobForm({ ...jobForm, rawText: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    rows={6}
                    placeholder="Paste the full job description here..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={processing === 'job'}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {processing === 'job' ? 'Processing...' : 'Save & Process'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJobForm(false)}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {jobs.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
                <p>No jobs yet. Add a job description to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job._id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{job.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.company && `${job.company} · `}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteJob(job._id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Match Tab */}
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
                >
                  <option value="">-- Choose a job --</option>
                  {jobs.map(j => (
                    <option key={j._id} value={j._id}>{j.title} {j.company && `— ${j.company}`}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleMatch}
                disabled={matching || !selectedResume || !selectedJob}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Zap size={16} />
                {matching ? 'Matching...' : 'Run Match + Gap Analysis'}
              </button>
              {(resumes.length === 0 || jobs.length === 0) && (
                <p className="text-xs text-amber-500 text-center">
                  You need at least one resume and one job description to run a match.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Match Results</h2>
            {matches.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Zap size={40} className="mx-auto mb-3 opacity-30" />
                <p>No matches yet. Run a match to see results.</p>
              </div>
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