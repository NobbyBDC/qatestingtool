import { useState } from 'react';
import { Eye, Play, AlertCircle, CheckCircle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../api/client';

const STANDARDS = [
  { id: 'wcag20a',   label: 'WCAG 2.0 Level A' },
  { id: 'wcag20aa',  label: 'WCAG 2.0 Level AA' },
  { id: 'wcag21aa',  label: 'WCAG 2.1 Level AA' },
  { id: 'wcag21aaa', label: 'WCAG 2.1 Level AAA' },
  { id: 'best',      label: 'Best Practice' },
  { id: 's508',      label: 'Section 508' },
  { id: 'common',    label: 'Common Issues' }
];

const IMPACT = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/8 border-red-500/25',    dot: 'bg-red-400' },
  serious:  { color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/25', dot: 'bg-orange-400' },
  moderate: { color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/25', dot: 'bg-yellow-400' },
  minor:    { color: 'text-blue-400',   bg: 'bg-blue-500/8 border-blue-500/25',   dot: 'bg-blue-400' }
};

function ViolationCard({ v }) {
  const [open, setOpen] = useState(false);
  const imp = IMPACT[v.impact] || IMPACT.minor;

  return (
    <div className={`rounded-xl border ${imp.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/2 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${imp.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{v.id}</span>
            <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full border ${imp.bg} ${imp.color}`}>
              {v.impact}
            </span>
            <span className="text-xs text-slate-500 font-mono">WCAG {v.wcag}</span>
            <span className="text-xs text-slate-500">{v.nodes} element{v.nodes !== 1 ? 's' : ''} affected</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{v.description}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/5">
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1">How to fix</p>
              <p className="text-sm text-slate-300 leading-relaxed">{v.howToFix}</p>
            </div>
            <a
              href={v.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View rule documentation →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div className={`rounded-xl p-4 text-center ${bg}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function Accessibility() {
  const [url, setUrl] = useState('');
  const [standards, setStandards] = useState(['wcag20aa', 'wcag21aa']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const toggleStd = (id) => {
    setStandards(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const run = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.post('/tests/accessibility', { url, standards });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `a11y-report-${Date.now()}.json`;
    a.click();
  };

  const s = results?.summary;

  return (
    <div className="fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Eye className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Accessibility Tester</h1>
          <p className="text-xs text-slate-400">WCAG 2.0/2.1 compliance scanning</p>
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
            <label className="block text-sm font-medium text-slate-300 mb-2.5">Standards to Check</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STANDARDS.map(std => (
                <label
                  key={std.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                    standards.includes(std.id)
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={standards.includes(std.id)}
                    onChange={() => toggleStd(std.id)}
                    className="sr-only"
                  />
                  <span className={`w-3.5 h-3.5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                    standards.includes(std.id) ? 'bg-purple-500 border-purple-500' : 'border-slate-600'
                  }`}>
                    {standards.includes(std.id) && (
                      <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs font-medium leading-tight">{std.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || standards.length === 0}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            {loading
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" /> Scanning…</>
              : <><Play className="w-3.5 h-3.5" /> Run Accessibility Scan</>
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
          {/* Summary */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Results</h2>
              <button
                onClick={download}
                className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Violations" value={s?.violations} color="text-red-400" bg="bg-red-500/8 border border-red-500/20 rounded-xl" />
              <StatCard label="Passes" value={s?.passes} color="text-green-400" bg="bg-green-500/8 border border-green-500/20 rounded-xl" />
              <StatCard label="Incomplete" value={s?.incomplete} color="text-yellow-400" bg="bg-yellow-500/8 border border-yellow-500/20 rounded-xl" />
              <StatCard label="Inapplicable" value={s?.inapplicable} color="text-slate-400" bg="bg-slate-800 border border-slate-700 rounded-xl" />
            </div>
          </div>

          {/* Violations */}
          {results.violations?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">
                Violations ({results.violations.length})
              </h3>
              <div className="space-y-2">
                {results.violations.map(v => (
                  <ViolationCard key={v.id} v={v} />
                ))}
              </div>
            </div>
          )}

          {/* Passes */}
          {results.passes?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">
                Passing Tests ({results.passes.length})
              </h3>
              <div className="space-y-1.5">
                {results.passes.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-green-300">{p.id}</span>
                    <span className="text-xs text-slate-400">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
