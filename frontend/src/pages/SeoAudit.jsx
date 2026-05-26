import { useState } from 'react';
import { Search, Play, AlertCircle, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../api/client';

const OPTIONS = [
  { id: 'mobile',      label: 'Mobile Testing' },
  { id: 'desktop',     label: 'Desktop Testing' },
  { id: 'vitals',      label: 'Core Web Vitals' },
  { id: 'seo',         label: 'SEO Audit' },
  { id: 'https',       label: 'HTTPS / Security' },
  { id: 'structured',  label: 'Structured Data' }
];

const STATUS_CFG = {
  good:             { color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'Good' },
  'needs-improvement': { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Needs Improvement' },
  poor:             { color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'Poor' }
};

const IMPACT_CFG = {
  HIGH:   { color: 'text-red-400',    badge: 'bg-red-500/10 border-red-500/20' },
  MEDIUM: { color: 'text-yellow-400', badge: 'bg-yellow-500/10 border-yellow-500/20' },
  LOW:    { color: 'text-blue-400',   badge: 'bg-blue-500/10 border-blue-500/20' }
};

function ScoreRing({ score, label, size = 'md' }) {
  const color = score >= 90 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const r = size === 'lg' ? 40 : 28;
  const cx = r + 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width={cx * 2} height={cx * 2}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="white" fontSize={size === 'lg' ? 18 : 13} fontWeight="bold">
          {score}
        </text>
      </svg>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  );
}

function VitalCard({ vital }) {
  const cfg = STATUS_CFG[vital.status] || STATUS_CFG.poor;
  return (
    <div className="bg-slate-800/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{vital.label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${cfg.color}`}>{vital.value}</span>
        <span className="text-xs text-slate-500">{vital.unit}</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">
        Good: &lt;{vital.thresholds?.good}{vital.unit} · Poor: &gt;{vital.thresholds?.poor}{vital.unit}
      </div>
    </div>
  );
}

export default function SeoAudit() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [options, setOptions] = useState({ mobile: true, desktop: true, vitals: true, seo: true });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const toggle = (id) => setOptions(p => ({ ...p, [id]: !p[id] }));

  const run = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.post('/tests/seo', { url, options, apiKey: apiKey || undefined });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Audit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `seo-audit-${Date.now()}.json`;
    a.click();
  };

  const vitals = results?.coreWebVitals;

  return (
    <div className="fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">SEO &amp; Performance Audit</h1>
          <p className="text-xs text-slate-400">Google PageSpeed Insights · Core Web Vitals</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
        <form onSubmit={run} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Target URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Google PageSpeed API Key{' '}
              <span className="text-slate-500 font-normal">
                (optional — leave blank for demo results.{' '}
                <a
                  href="https://developers.google.com/speed/docs/insights/v5/get-started#key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  Get a free key →
                </a>
                )
              </span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">Audit Options</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                    options[opt.id]
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!options[opt.id]}
                    onChange={() => toggle(opt.id)}
                    className="sr-only"
                  />
                  <span className={`w-3.5 h-3.5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                    options[opt.id] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}>
                    {options[opt.id] && (
                      <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            {loading
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" /> Auditing…</>
              : <><Play className="w-3.5 h-3.5" /> Run SEO Audit</>
            }
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-5 fade-in">
          {/* Score cards */}
          {results.scores && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white text-sm">
                  Scores
                  {!results.real && (
                    <span className="ml-2 text-xs font-normal text-slate-500">(demo data — add PAGESPEED_API_KEY for real results)</span>
                  )}
                </h2>
                <button
                  onClick={download}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
              <div className="flex items-center justify-around flex-wrap gap-4">
                <ScoreRing score={results.scores.mobile} label="Mobile" size="lg" />
                <ScoreRing score={results.scores.desktop} label="Desktop" size="lg" />
                <ScoreRing score={results.scores.seo} label="SEO" size="lg" />
                <ScoreRing score={results.scores.accessibility} label="Accessibility" size="lg" />
                <ScoreRing score={results.scores.bestPractices} label="Best Practices" size="lg" />
              </div>
            </div>
          )}

          {/* Core Web Vitals */}
          {vitals && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Core Web Vitals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(vitals).map(v => (
                  <VitalCard key={v.label} vital={v} />
                ))}
              </div>
            </div>
          )}

          {/* Page stats */}
          {results.pageStats && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Page Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(results.pageStats).map(([key, val]) => (
                  <div key={key} className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <div className="text-base font-bold text-white">{val}</div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {results.issues?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Recommendations</h3>
              <div className="space-y-2">
                {results.issues.map((issue, i) => {
                  const imp = IMPACT_CFG[issue.impact] || IMPACT_CFG.LOW;
                  const passed = issue.status === 'passed';
                  return (
                    <div key={i} className={`flex items-start gap-3 rounded-xl border p-4 ${passed ? 'bg-green-500/5 border-green-500/15' : 'bg-slate-900 border-slate-800'}`}>
                      {passed
                        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        : issue.impact === 'HIGH'
                          ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          : <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium text-white">{issue.title}</span>
                          {!passed && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${imp.badge} ${imp.color}`}>
                              {issue.impact}
                            </span>
                          )}
                          {passed && <span className="text-xs text-green-400">Passed</span>}
                        </div>
                        {issue.fix && <p className="text-xs text-slate-400 leading-relaxed">{issue.fix}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
