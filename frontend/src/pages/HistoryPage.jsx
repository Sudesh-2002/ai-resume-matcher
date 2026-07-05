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
  Search, SlidersHorizontal, LogOut,
} from 'lucide-react';

export default function HistoryPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [deleting, setDeleting] = useState(null);

  // Filter + sort state
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await getMatches();
      setMatches(res.data.matches);
    } catch {
      toast.error('Failed to load match history');
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      try {
        const res = await getMatchById(id);
        setDetailCache(prev => ({ ...prev, [id]: res.data.match }));
      } catch {
        toast.error('Failed to load match details');
      }
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteMatch(id);
      toast.success('Match deleted');
      setMatches(prev => prev.filter(m => m._id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // Filtered + sorted matches
  const filtered = useMemo(() => {
    let result = matches.filter(m => {
      const jobTitle = m.jobDescription?.title?.toLowerCase() || '';
      const fileName = m.resume?.originalFileName?.toLowerCase() || '';
      const company = m.jobDescription?.company?.toLowerCase() || '';
      const q = search.toLowerCase();
      const matchesSearch = !q || jobTitle.includes(q) || fileName.includes(q) || company.includes(q);
      const matchesScore = m.overallMatchPercentage >= minScore;
      return matchesSearch && matchesScore;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'score_desc') return b.overallMatchPercentage - a.overallMatchPercentage;
      if (sortBy === 'score_asc') return a.overallMatchPercentage - b.overallMatchPercentage;
      return 0;
    });

    return result;
  }, [matches, search, minScore, sortBy]);

  const scoreColor = (score) =>
    score >= 75 ? 'text-green-400' :
    score >= 50 ? 'text-amber-400' :
    'text-red-400';

  const scoreBg = (score) =>
    score >= 75 ? 'bg-green-400' :
    score >= 50 ? 'bg-amber-400' :
    'bg-red-400';

  const scoreLabel = (score) =>
    score >= 75 ? 'Strong Match' :
    score >= 50 ? 'Partial Match' :
    'Weak Match';

  const buildRadarData = (match) => [
    { subject: 'Matched Skills', value: match.matchedSkills?.length || 0 },
    { subject: 'Missing Skills', value: match.missingSkills?.length || 0 },
    { subject: 'Similarity', value: Math.round((match.similarityScore || 0) * 10) },
    { subject: 'Overall', value: Math.round((match.overallMatchPercentage || 0) / 10) },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Match History</h1>
            <p className="text-gray-400 text-xs">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={() => { logoutUser(); navigate('/login'); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Search + filter bar */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title, company, or resume..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                showFilters
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Minimum Match Score: <span className="text-indigo-400 font-medium">{minScore}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="score_desc">Highest Score First</option>
                  <option value="score_asc">Lowest Score First</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Summary stats */}
        {matches.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{matches.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Matches</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {matches.filter(m => m.overallMatchPercentage >= 75).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Strong Matches</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">
                {matches.length > 0
                  ? Math.round(matches.reduce((s, m) => s + m.overallMatchPercentage, 0) / matches.length)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg Score</p>
            </div>
          </div>
        )}

        {/* Match list */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading match history...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            {matches.length === 0
              ? 'No matches yet. Run a match from the dashboard.'
              : 'No matches found with current filters.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(match => {
              const detail = detailCache[match._id];
              const isExpanded = expandedId === match._id;

              return (
                <div key={match._id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

                  {/* Row */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Score circle */}
                    <div className="shrink-0 w-14 h-14 rounded-full border-2 border-gray-700 flex flex-col items-center justify-center">
                      <p className={`text-sm font-bold leading-none ${scoreColor(match.overallMatchPercentage)}`}>
                        {match.overallMatchPercentage}%
                      </p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white truncate">
                          {match.jobDescription?.title || 'Job'}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          match.overallMatchPercentage >= 75
                            ? 'bg-green-900/40 text-green-400'
                            : match.overallMatchPercentage >= 50
                            ? 'bg-amber-900/40 text-amber-400'
                            : 'bg-red-900/40 text-red-400'
                        }`}>
                          {scoreLabel(match.overallMatchPercentage)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {match.jobDescription?.company && `${match.jobDescription.company} · `}
                        {match.resume?.originalFileName}
                      </p>
                      <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                        <div
                          className={`h-1 rounded-full ${scoreBg(match.overallMatchPercentage)}`}
                          style={{ width: `${match.overallMatchPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <p className="text-xs text-gray-600 shrink-0 hidden sm:block">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(match._id)}
                        disabled={deleting === match._id}
                        className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => handleExpand(match._id)}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 px-5 py-5 space-y-6">

                      {/* Skills */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                            Matched Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matchedSkills?.length > 0
                              ? match.matchedSkills.map(s => (
                                  <span key={s} className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">
                                    {s}
                                  </span>
                                ))
                              : <span className="text-xs text-gray-600">None</span>
                            }
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                            Missing Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.missingSkills?.length > 0
                              ? match.missingSkills.map(s => (
                                  <span key={s} className="text-xs bg-red-900/40 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                                    {s}
                                  </span>
                                ))
                              : <span className="text-xs text-gray-600">None missing</span>
                            }
                          </div>
                        </div>
                      </div>

                      {/* Radar chart */}
                      <div>
                        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
                          Match Breakdown
                        </p>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={buildRadarData(match)}>
                              <PolarGrid stroke="#374151" />
                              <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                              />
                              <Radar
                                name="Score"
                                dataKey="value"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.3}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: '#111827',
                                  border: '1px solid #374151',
                                  borderRadius: 8,
                                }}
                                labelStyle={{ color: '#e5e7eb' }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gap analysis */}
                      {(detail?.gapAnalysis || match.gapAnalysis) && (
                        <div>
                          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
                            Gap Analysis
                          </p>
                          <div className="bg-gray-800/50 rounded-xl p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {detail?.gapAnalysis || match.gapAnalysis}
                          </div>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex gap-6 text-xs text-gray-600 pt-2 border-t border-gray-800">
                        <span>Similarity score: {(match.similarityScore * 100).toFixed(1)}%</span>
                        <span>Matched: {new Date(match.createdAt).toLocaleString()}</span>
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