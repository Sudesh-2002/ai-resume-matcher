import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, ArrowRight, FileText, Brain, BarChart3 } from 'lucide-react';

const features = [
  { icon: FileText, text: 'PDF resume parsing with LLM extraction' },
  { icon: Brain,    text: 'Semantic matching via vector embeddings' },
  { icon: BarChart3,text: 'Gap analysis with actionable career advice' },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.includes('@')) { toast.error('Enter a valid email'); return; }
    if (form.password.length < 6)  { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.user, res.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Left panel (desktop only) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12 border-r"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center glow-pulse"
            style={{ background: 'var(--accent-dim)' }}
          >
            <Zap size={16} color="var(--bg)" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>
            AI Resume Matcher
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-6">
          <div className="space-y-3">
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--accent)' }}
            >
              Semantic matching
            </p>
            <h1
              className="text-4xl font-bold leading-tight"
              style={{ color: 'var(--text)' }}
            >
              Know exactly where you stand before you apply.
            </h1>
          </div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Upload your resume, paste a job description, and get a semantic match score plus a personalised gap analysis — powered by vector search and LLaMA-3.3-70b.
          </p>

          {/* Feature list */}
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-glow)', border: '1px solid var(--border2)' }}
                >
                  <Icon size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Built with MongoDB Atlas Vector Search · Groq · HuggingFace
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}
            >
              <Zap size={16} color="var(--bg)" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              AI Resume Matcher
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Sign in</h2>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Create one free
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-dim)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none"
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
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: loading ? 'var(--accent-dim)' : 'var(--accent)',
                color: 'var(--bg)',
              }}
              onMouseEnter={e => !loading && (e.target.style.opacity = '0.9')}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <ArrowRight size={16} />
              }
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}