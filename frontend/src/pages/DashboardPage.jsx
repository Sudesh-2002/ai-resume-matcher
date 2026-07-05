import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getResumes, uploadResume, extractResume, embedResume, deleteResume } from '../api/resumes';
import { getJobs, createJob, extractJob, embedJob, deleteJob } from '../api/jobs';
import { createMatch, getMatches, analyzeMatch } from '../api/match';
import toast from 'react-hot-toast';
import {
  Upload, Briefcase, Zap, LogOut, Trash2,
  FileText, History, Plus, X, ChevronRight,
} from 'lucide-react';
import MatchCard from '../components/MatchCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';

const UPLOAD_LABELS = {
  '': 'Upload PDF',
  uploading: 'Uploading...',
  extracting: 'Extracting skills...',
  embedding: 'Generating embedding...',
};

const NAV = [
  { id: 'resumes', label: 'Resumes', icon: FileText },
  { id: 'jobs',    label: 'Jobs',    icon: Briefcase },
  { id: 'match',   label: 'Match',   icon: Zap },
  { id: 'results', label: 'Results', icon: BarChart3Stub },
];

function BarChart3Stub({ size, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

export default function DashboardPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs]       = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('resumes');
  const [uploadStep, setUploadStep] = useState('');
  const [processing, setProcessing] = useState('');
  const [jobForm, setJobForm] = useState({ title: '', company: '', rawText: '' });
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedJob, setSelectedJob]       = useState('');
  const [matching, setMatching]             = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const uploading = uploadStep !== '';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setInitialLoading(true);
    try {
      const [r, j, m] = await Promise.all([getResumes(), getJobs(), getMatches()]);
      setResumes(r.data.resumes);
      setJobs(j.data.jobs);
      setMatches(m.data.matches);
    } catch { toast.error('Failed to load data'); }
    finally  { setInitialLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const fd = new FormData();
      fd.append('resume', file);
      setUploadStep('uploading');
      const res = await uploadResume(fd);
      const id = res.data.resume.id;
      setProcessing(id);
      setUploadStep('extracting');
      toast.success('Uploaded — extracting skills...');
      await extractResume(id);
      setUploadStep('embedding');
      toast.success('Extracted — generating embedding...');
      await embedResume(id);
      toast.success('Resume ready!');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploadStep(''); setProcessing(''); }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim())             { toast.error('Job title is required'); return; }
    if (jobForm.rawText.trim().length < 50){ toast.error('Paste the full job description'); return; }
    try {
      setProcessing('job');
      const res = await createJob(jobForm);
      const id = res.data.job.id;
      toast.success('Saved — extracting requirements...');
      await extractJob(id);
      toast.success('Extracted — generating embedding...');
      await embedJob(id);
      toast.success('Job ready!');
      setJobForm({ title: '', company: '', rawText: '' });
      setShowJobForm(false);
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    } finally { setProcessing(''); }
  };

  const handleMatch = async () => {
    if (!selectedResume || !selectedJob) { toast.error('Select both a resume and a job'); return; }
    setMatching(true);
    try {
      toast.success('Running vector search...');
      const res = await createMatch({ resumeId: selectedResume, jobId: selectedJob });
      toast.success('Generating gap analysis...');
      await analyzeMatch(res.data.match.id);
      toast.success('Match complete!');
      await fetchAll();
      setActiveTab('results');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Match failed');
    } finally { setMatching(false); }
  };

  const handleDeleteResume = async (id) => {
    try { await deleteResume(id); setResumes(p => p.filter(r => r._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const handleDeleteJob = async (id) => {
    try { await deleteJob(id); setJobs(p => p.filter(j => j._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const tabs = [
    { id: 'resumes', label: 'Resumes', icon: FileText,       count: resumes.length },
    { id: 'jobs',    label: 'Jobs',    icon: Briefcase,      count: jobs.length },
    { id: 'match',   label: 'Match',   icon: Zap,            count: null },
    { id: 'results', label: 'Results', icon: BarChart3Stub,  count: matches.length },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 border-r min-h-screen sticky top-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center glow-pulse shrink-0"
              style={{ background: 'var(--accent-dim)' }}
            >
              <Zap size={14} color="var(--bg)" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold leading-none" style={{ color: 'var(--text)' }}>AI Resume</p>
              <p className="text-xs font-bold leading-none" style={{ color: 'var(--accent)' }}>Matcher</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--surface2)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--accent-dim)', color: 'var(--bg)' }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  background: active ? 'var(--accent-glow)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  border: active ? '1px solid var(--border2)' : '1px solid transparent',
                }}
              >
                <Icon size={16} style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }} />
                <span className="flex-1">{label}</span>
                {count !== null && count > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ color: 'var(--text-2)' }}
          >
            <History size={16} style={{ color: 'var(--text-3)' }} />
            History
          </button>
          <button
            onClick={() => { logoutUser(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ color: 'var(--text-2)' }}
          >
            <LogOut size={16} style={{ color: 'var(--text-3)' }} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <Zap size={12} color="var(--bg)" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>AI Resume Matcher</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/history')} style={{ color: 'var(--text-2)' }}>
              <History size={18} />
            </button>
            <button onClick={() => { logoutUser(); navigate('/login'); }} style={{ color: 'var(--text-2)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Desktop page header */}
        <div
          className="hidden lg:flex items-center justify-between px-8 py-5 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              {activeTab === 'resumes' && 'Upload and manage your resume PDFs'}
              {activeTab === 'jobs'    && 'Add job descriptions to match against'}
              {activeTab === 'match'   && 'Run a semantic match between resume and job'}
              {activeTab === 'results' && 'Your match results and gap analyses'}
            </p>
          </div>

          {/* Tab-specific CTA in header */}
          {activeTab === 'resumes' && (
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{
                background: uploading ? 'var(--surface2)' : 'var(--accent)',
                color: uploading ? 'var(--text-2)' : 'var(--bg)',
                pointerEvents: uploading ? 'none' : 'auto',
              }}
            >
              {uploading
                ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Upload size={15} />
              }
              {UPLOAD_LABELS[uploadStep]}
              <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          )}
          {activeTab === 'jobs' && (
            <button
              onClick={() => setShowJobForm(!showJobForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              {showJobForm ? <X size={15} /> : <Plus size={15} />}
              {showJobForm ? 'Cancel' : 'Add Job'}
            </button>
          )}
        </div>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6 max-w-4xl w-full">

          {/* ── Resumes Tab ── */}
          {activeTab === 'resumes' && (
            <div className="space-y-4">
              {/* Mobile upload button */}
              <label
                className="lg:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  background: uploading ? 'var(--surface2)' : 'var(--accent)',
                  color: uploading ? 'var(--text-2)' : 'var(--bg)',
                  pointerEvents: uploading ? 'none' : 'auto',
                }}
              >
                {uploading
                  ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Upload size={15} />
                }
                {UPLOAD_LABELS[uploadStep]}
                <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>

              {initialLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
              ) : resumes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No resumes yet"
                  description="Upload a PDF — we'll extract your skills and generate a vector embedding automatically."
                />
              ) : (
                <div className="space-y-3">
                  {resumes.map(resume => (
                    <div
                      key={resume._id}
                      className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all slide-up"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderLeft: '3px solid var(--accent-dim)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--surface2)' }}
                      >
                        <FileText size={16} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {resume.originalFileName}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                          {processing === resume._id && (
                            <span className="ml-2 animate-pulse" style={{ color: 'var(--accent)' }}>Processing...</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteResume(resume._id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Jobs Tab ── */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {/* Mobile add button */}
              <button
                onClick={() => setShowJobForm(!showJobForm)}
                className="lg:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                {showJobForm ? <X size={15} /> : <Plus size={15} />}
                {showJobForm ? 'Cancel' : 'Add Job Description'}
              </button>

              {showJobForm && (
                <form
                  onSubmit={handleCreateJob}
                  className="rounded-xl border p-5 space-y-4 slide-up"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>New Job Description</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Job Title *', key: 'title', placeholder: 'Full Stack Engineer' },
                      { label: 'Company', key: 'company', placeholder: 'TechCorp' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{label}</label>
                        <input
                          type="text"
                          value={jobForm[key]}
                          onChange={(e) => setJobForm({ ...jobForm, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                          onFocus={e => e.target.style.borderColor = 'var(--accent-dim)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                      Job Description Text *
                      <span className="ml-1 font-normal" style={{ color: 'var(--text-3)' }}>— paste the full posting</span>
                    </label>
                    <textarea
                      value={jobForm.rawText}
                      onChange={(e) => setJobForm({ ...jobForm, rawText: e.target.value })}
                      placeholder="Paste the full job description here..."
                      rows={6}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-dim)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    {jobForm.rawText.length > 0 && jobForm.rawText.length < 50 && (
                      <p className="text-xs" style={{ color: 'var(--amber)' }}>
                        Too short — paste the full description for accurate results
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={processing === 'job'}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                    >
                      {processing === 'job' && (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {processing === 'job' ? 'Processing...' : 'Save & Process'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowJobForm(false); setJobForm({ title: '', company: '', rawText: '' }); }}
                      className="px-4 py-2.5 rounded-lg text-sm"
                      style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {initialLoading ? (
                <div className="space-y-3">{[1,2].map(i => <SkeletonCard key={i} />)}</div>
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
                      className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all slide-up"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderLeft: '3px solid var(--accent-dim)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--surface2)' }}
                      >
                        <Briefcase size={16} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{job.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {job.company && `${job.company} · `}
                          {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Match Tab ── */}
          {activeTab === 'match' && (
            <div className="max-w-md space-y-5">
              <div
                className="rounded-xl border p-6 space-y-5"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                {[
                  { label: 'Select Resume', value: selectedResume, setter: setSelectedResume, items: resumes, keyFn: r => r._id, labelFn: r => r.originalFileName, empty: 'No resumes — upload one first' },
                  { label: 'Select Job Description', value: selectedJob, setter: setSelectedJob, items: jobs, keyFn: j => j._id, labelFn: j => j.company ? `${j.title} — ${j.company}` : j.title, empty: 'No jobs — add one first' },
                ].map(({ label, value, setter, items, keyFn, labelFn, empty }) => (
                  <div key={label} className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{label}</label>
                    <select
                      value={value}
                      onChange={e => setter(e.target.value)}
                      disabled={items.length === 0}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none appearance-none"
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        color: value ? 'var(--text)' : 'var(--text-3)',
                      }}
                    >
                      <option value="">{items.length === 0 ? empty : `-- Choose --`}</option>
                      {items.map(item => (
                        <option key={keyFn(item)} value={keyFn(item)}>{labelFn(item)}</option>
                      ))}
                    </select>
                  </div>
                ))}

                <button
                  onClick={handleMatch}
                  disabled={matching || !selectedResume || !selectedJob}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                >
                  {matching
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Zap size={16} />
                  }
                  {matching ? 'Matching...' : 'Run Match + Gap Analysis'}
                </button>

                {/* How it works */}
                <div
                  className="rounded-lg p-4 space-y-3"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    How it works
                  </p>
                  {[
                    'Vector search compares your resume embedding vs the job',
                    'Skill overlap score: your skills vs required + preferred',
                    'Groq generates a personalised gap analysis with action steps',
                  ].map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span
                        className="text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--border2)' }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Results Tab ── */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {matches.length} match{matches.length !== 1 ? 'es' : ''}
                </p>
                {matches.length > 0 && (
                  <button
                    onClick={() => navigate('/history')}
                    className="flex items-center gap-1 text-xs font-medium transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    Full history <ChevronRight size={13} />
                  </button>
                )}
              </div>

              {initialLoading ? (
                <div className="space-y-3">{[1,2].map(i => <SkeletonCard key={i} />)}</div>
              ) : matches.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No matches yet"
                  description="Go to the Match tab, select a resume and job description, then run a match."
                  action={
                    <button
                      onClick={() => setActiveTab('match')}
                      className="text-sm px-4 py-2 rounded-xl font-semibold"
                      style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                    >
                      Run your first match
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {matches.map(match => <MatchCard key={match._id} match={match} />)}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 border-t flex items-center justify-around px-2 py-2 z-20"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {tabs.map(({ id, label, icon: Icon, count }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative"
              style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
              {count !== null && count > 0 && (
                <span
                  className="absolute -top-0.5 right-2 w-4 h-4 flex items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--bg)', fontSize: '9px' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}