import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMatches, getMatchById, deleteMatch } from '../api/match';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  ArrowLeft, Trash2, ChevronDown, ChevronUp,
  Search, SlidersHorizontal, LogOut, Zap,
} from 'lucide-react';

function ScoreRing({ score, size = 56 }) {
  const radius = (size / 2) - 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? 'var(--green)' :
    score >= 50 ? 'var(--amber)' :
    'var(--red)';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          className="score-ring-circle"
          style={{ '--ring-offset': offset, filter: `drop-shadow(0 0 5px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [deleting, setDeleting]       = useState(null);
  const [search, setSearch]           = useState('');
  const [minScore, setMinScore]       = useState(0);
  const [sortBy, setSortBy]           = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await getMatches();
      setMatches(res.data.matches);
    } catch { toast.error('Failed to load match history'); }
    finally { setLoading(false); }
  };

  const handleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!detailCache[id]) {
      try {
        const res = await getMatchById(id);
        setDetailCache(p => ({ ...p, [id]: res.data.match }));
      } catch { toast.error('Failed to load details'); }
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteMatch(id);
      toast.success('Match deleted');
      setMatches(p => p.filter(m => m._id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(null); }
  };

  const filtered = useMemo(() => {
    let r = matches.filter(m => {
      const q = search.toLowerCase();
      const hit =
        !q ||
        m.jobDescription?.title?.toLowerCase().includes(q) ||
        m.resume?.originalFileName?.toLowerCase().includes(q) ||
        m.jobDescription?.company?.toLowerCase().includes(q);
      return hit && m.overallMatchPercentage >= minScore;
    });
    r.sort((a, b) => {
      if (sortBy === 'date_desc')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'date_asc')   return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'score_desc') return b.overallMatchPercentage - a.overallMatchPercentage;
      if (sortBy === 'score_asc')  return a.overallMatchPercentage - b.overallMatchPercentage;
      return 0;
    });
    return r;
  }, [matches, search, minScore, sortBy]);

  const avg = matches.length
    ? Math.round(matches.reduce((s, m) => s + m.overallMatchPercentage, 0) / matches.length)
    : 0;

  const strong = matches.filter(m => m.overallMatchPercentage >= 75).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 lg:px-8 py-4 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Match History</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{user?.name}</p>
          </div>
        </div>
        <button
          onClick={() => { logoutUser(); navigate('/login'); }}
          className="flex items-center gap-2 text-sm transition-all"
          style={{ color: 'var(--text-2)' }}
        >
          <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Stats */}
        {matches.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Matches', value: matches.length, color: 'var(--text)' },
              { label: 'Strong Matches', value: strong, color: 'var(--green)' },
              { label: 'Avg Score', value: `${avg}%`, color: 'var(--accent)' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border p-4 text-center"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by job title, company, or resume..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-dim)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all"
              style={{
                background: showFilters ? 'var(--accent-glow)' : 'var(--surface)',
                borderColor: showFilters ? 'var(--accent-dim)' : 'var(--border)',
                color: showFilters ? 'var(--accent)' : 'var(--text-2)',
              }}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {showFilters && (
            <div
              className="rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 slide-up"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                  Min score: <span style={{ color: 'var(--accent)' }}>{minScore}%</span>
                </label>
                <input
                  type="range" min={0} max={100} step={5} value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Sort by</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="score_desc">Highest score first</option>
                  <option value="score_asc">Lowest score first</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Match list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Zap size={40} className="mx-auto" style={{ color: 'var(--border)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
              {matches.length === 0 ? 'No matches yet' : 'No matches with current filters'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {matches.length === 0
                ? 'Run a match from the dashboard to see results here.'
                : 'Try lowering the minimum score or clearing the search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(match => {
              const detail = detailCache[match._id];
              const isExpanded = expandedId === match._id;
              const score = match.overallMatchPercentage;
              const accentColor =
                score >= 75 ? 'var(--green)' :
                score >= 50 ? 'var(--amber)' :
                'var(--red)';
              const scoreLabel =
                score >= 75 ? 'Strong' :
                score >= 50 ? 'Partial' :
                'Weak';

              return (
                <div
                  key={match._id}
                  className="rounded-xl border overflow-hidden slide-up"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderLeft: `3px solid ${accentColor}`,
                  }}
                >
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <ScoreRing score={score} size={52} />

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                          {match.jobDescription?.title || 'Job'}
                        </p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            background: score >= 75 ? 'var(--green-bg)' : score >= 50 ? 'var(--amber-bg)' : 'var(--red-bg)',
                            color: accentColor,
                          }}
                        >
                          {scoreLabel}
                        </span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>
                        {match.jobDescription?.company && `${match.jobDescription.company} · `}
                        {match.resume?.originalFileName}
                      </p>
                      <div className="w-full rounded-full h-1 mt-1.5" style={{ background: 'var(--border)' }}>
                        <div className="h-1 rounded-full" style={{ width: `${score}%`, background: accentColor }} />
                      </div>
                    </div>

                    <p className="text-xs shrink-0 hidden sm:block" style={{ color: 'var(--text-3)' }}>
                      {new Date(match.createdAt).toLocaleDateString()}
                    </p>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDelete(match._id)}
                        disabled={deleting === match._id}
                        className="p-1.5 rounded-lg transition-all disabled:opacity-50"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => handleExpand(match._id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t px-4 py-5 space-y-5" style={{ borderColor: 'var(--border)' }}>

                      {/* Skills */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: 'Matched Skills', items: match.matchedSkills, variant: 'matched', empty: 'None' },
                          { label: 'Missing Skills', items: match.missingSkills, variant: 'missing', empty: 'None missing!' },
                        ].map(({ label, items, variant, empty }) => (
                          <div key={label} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                              {label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {items?.length > 0
                                ? items.map(s => (
                                    <span
                                      key={s}
                                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                                      style={
                                        variant === 'matched'
                                          ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.2)' }
                                          : { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' }
                                      }
                                    >
                                      {s}
                                    </span>
                                  ))
                                : <span className="text-xs" style={{ color: 'var(--text-3)' }}>{empty}</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Radar */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                          Breakdown
                        </p>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[
                              { subject: 'Matched',    value: match.matchedSkills?.length || 0 },
                              { subject: 'Missing',    value: match.missingSkills?.length || 0 },
                              { subject: 'Similarity', value: Math.round((match.similarityScore || 0) * 10) },
                              { subject: 'Overall',    value: Math.round(score / 10) },
                            ]}>
                              <PolarGrid stroke="var(--border)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-2)', fontSize: 11 }} />
                              <Radar
                                name="Score" dataKey="value"
                                stroke="var(--accent)" fill="var(--accent)"
                                fillOpacity={0.15} strokeWidth={2}
                              />
                              <Tooltip
                                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                                labelStyle={{ color: 'var(--text)' }}
                                itemStyle={{ color: 'var(--accent)' }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gap analysis */}
                      {(detail?.gapAnalysis || match.gapAnalysis) && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                            Gap Analysis
                          </p>
                          <div
                            className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                          >
                            {detail?.gapAnalysis || match.gapAnalysis}
                          </div>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-xs pt-2 border-t" style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}>
                        <span>Similarity: {((match.similarityScore || 0) * 100).toFixed(1)}%</span>
                        <span>{new Date(match.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}