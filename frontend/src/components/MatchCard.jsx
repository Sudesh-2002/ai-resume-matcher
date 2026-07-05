import { useState } from 'react';
import { getMatchById } from '../api/match';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const score = match.overallMatchPercentage;
  const scoreColor =
    score >= 75 ? 'text-green-400' :
    score >= 50 ? 'text-amber-400' :
    'text-red-400';

  const scoreBg =
    score >= 75 ? 'bg-green-400' :
    score >= 50 ? 'bg-amber-400' :
    'bg-red-400';

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true);
      try {
        const res = await getMatchById(match._id);
        setDetail(res.data.match);
      } catch {
        // silently fail — we'll still show basic info
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  // Build radar chart data from matched/missing skills
  const radarData = [
    { subject: 'Required Skills', value: match.matchedSkills?.length || 0 },
    { subject: 'Missing Skills', value: match.missingSkills?.length || 0 },
    { subject: 'Similarity', value: Math.round((match.similarityScore || 0) * 10) },
    { subject: 'Overall', value: Math.round(score / 10) },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Summary row */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${scoreColor}`}>{score}%</p>
            <p className="text-xs text-gray-500">match</p>
          </div>
          <div>
            <p className="font-medium text-white">
              {match.resume?.originalFileName || 'Resume'}
            </p>
            <p className="text-sm text-gray-400">
              vs {match.jobDescription?.title}
              {match.jobDescription?.company && ` — ${match.jobDescription.company}`}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {new Date(match.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={handleExpand}
          className="text-gray-500 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Score bar */}
      <div className="px-5 pb-4">
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${scoreBg} transition-all`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-5 space-y-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading details...</p>
          ) : (
            <>
              {/* Skills grid */}
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
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}