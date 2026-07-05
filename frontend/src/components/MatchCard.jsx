import { useState } from 'react';
import { getMatchById } from '../api/match';
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Score ring SVG — the signature design element
function ScoreRing({ score }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? 'var(--green)' :
    score >= 50 ? 'var(--amber)' :
    'var(--red)';

  const bgColor =
    score >= 75 ? 'var(--green-bg)' :
    score >= 50 ? 'var(--amber-bg)' :
    'var(--red-bg)';

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Track */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
        />
        {/* Fill — animated via CSS class */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="score-ring-circle"
          style={{
            '--ring-offset': offset,
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold leading-none" style={{ color }}>{score}%</span>
        <span className="text-xs leading-none mt-0.5" style={{ color: 'var(--text-3)' }}>match</span>
      </div>
    </div>
  );
}

function SkillPill({ label, variant }) {
  const styles = {
    matched: {
      background: 'var(--green-bg)',
      color: 'var(--green)',
      border: '1px solid rgba(52,211,153,0.2)',
    },
    missing: {
      background: 'var(--red-bg)',
      color: 'var(--red)',
      border: '1px solid rgba(248,113,113,0.2)',
    },
  };
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={styles[variant]}
    >
      {label}
    </span>
  );
}

export default function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(false);

  const score = match.overallMatchPercentage;

  const scoreLabel =
    score >= 75 ? 'Strong Match' :
    score >= 50 ? 'Partial Match' :
    'Weak Match';

  const accentColor =
    score >= 75 ? 'var(--green)' :
    score >= 50 ? 'var(--amber)' :
    'var(--red)';

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true);
      try {
        const res = await getMatchById(match._id);
        setDetail(res.data.match);
      } catch { /* show basic info */ }
      finally { setLoading(false); }
    }
    setExpanded(!expanded);
  };

  const radarData = [
    { subject: 'Matched',    value: match.matchedSkills?.length || 0 },
    { subject: 'Missing',    value: match.missingSkills?.length || 0 },
    { subject: 'Similarity', value: Math.round((match.similarityScore || 0) * 10) },
    { subject: 'Overall',    value: Math.round(score / 10) },
  ];

  return (
    <div
      className="rounded-xl border overflow-hidden slide-up transition-all"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* ── Summary row ── */}
      <div className="flex items-center gap-4 px-4 py-4">
        <ScoreRing score={score} />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {match.jobDescription?.title || 'Job'}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{
                background: score >= 75 ? 'var(--green-bg)' : score >= 50 ? 'var(--amber-bg)' : 'var(--red-bg)',
                color: accentColor,
                border: `1px solid ${accentColor}30`,
              }}
            >
              {scoreLabel}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>
            {match.jobDescription?.company && `${match.jobDescription.company} · `}
            {match.resume?.originalFileName}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {new Date(match.createdAt).toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={handleExpand}
          className="p-2 rounded-lg transition-all shrink-0"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="w-full rounded-full h-1" style={{ background: 'var(--border)' }}>
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${score}%`, background: accentColor }}
          />
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div
          className="border-t px-4 py-5 space-y-6"
          style={{ borderColor: 'var(--border)' }}
        >
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading details...</p>
          ) : (
            <>
              {/* Skills grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    Matched Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matchedSkills?.length > 0
                      ? match.matchedSkills.map(s => <SkillPill key={s} label={s} variant="matched" />)
                      : <span className="text-xs" style={{ color: 'var(--text-3)' }}>None</span>
                    }
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    Missing Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missingSkills?.length > 0
                      ? match.missingSkills.map(s => <SkillPill key={s} label={s} variant="missing" />)
                      : <span className="text-xs" style={{ color: 'var(--text-3)' }}>None — great fit!</span>
                    }
                  </div>
                </div>
              </div>

              {/* Radar chart */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  Match Breakdown
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="var(--accent)"
                        fill="var(--accent)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface2)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          color: 'var(--text)',
                        }}
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
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {detail?.gapAnalysis || match.gapAnalysis}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div
                className="flex flex-wrap gap-4 text-xs pt-2 border-t"
                style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}
              >
                <span>Semantic similarity: {((match.similarityScore || 0) * 100).toFixed(1)}%</span>
                <span>Matched: {new Date(match.createdAt).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}