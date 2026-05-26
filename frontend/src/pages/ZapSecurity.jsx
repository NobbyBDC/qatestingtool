import { useState } from 'react';
import { Shield, Play, AlertCircle, AlertTriangle, Info, Download, Copy } from 'lucide-react';
import api from '../api/client';

const SEV = {
  CRITICAL: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/25', dot: 'bg-red-400' },
  HIGH:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  MEDIUM:   { label: 'Medium',  color: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/25', dot: 'bg-yellow-400' },
  LOW:      { label: 'Low',     color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/25', dot: 'bg-blue-400' }
};

function SeverityBadge({ severity }) {
  const s = SEV[severity] || SEV.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function VulnCard({ v }) {
  const s = SEV[v.severity] || SEV.LOW;
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-semibold text-white text-sm">{v.name}</span>
            <SeverityBadge severity={v.severity} />
            <span className="text-xs font-mono text-slate-500">{v.cwe}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{v.description}</p>
          {v.url && (
            <p className="text-xs font-mono text-slate-500 mt-2 truncate">{v.url}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ZapSecurity() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const runScan = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.post('/tests/zap', { url, apiKey: apiKey || undefined });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zap-scan-${Date.now()}.json`;
    a.click();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const summary = results?.summary || {};

  return (
    <div className="fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">ZAP Security Scanner</h1>
          <p className="text-xs text-slate-400">OWASP ZAP vulnerability detection</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
        <form onSubmit={runScan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                ZAP API Key{' '}
                <span className="text-slate-500 font-normal">(optional — required for a running ZAP instance)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Leave blank for demo results"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            {loading
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" /> Scanning…</>
              : <><Play className="w-3.5 h-3.5" /> Run Security Scan</>
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
          {/* Summary bar */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white text-sm">Scan Complete</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{results.scanId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copy}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy JSON'}
                </button>
                <button
                  onClick={download}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Critical', count: summary.critical, s: SEV.CRITICAL },
                { label: 'High',     count: summary.high,     s: SEV.HIGH },
                { label: 'Medium',   count: summary.medium,   s: SEV.MEDIUM },
                { label: 'Low',      count: summary.low,      s: SEV.LOW }
              ].map(item => (
                <div key={item.label} className={`text-center rounded-xl p-3 ${item.s.bg} border ${item.s.border}`}>
                  <div className={`text-2xl font-bold ${item.s.color}`}>{item.count ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vulnerabilities */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Vulnerabilities ({results.vulnerabilities?.length ?? 0})
            </h3>
            <div className="space-y-2.5">
              {results.vulnerabilities?.map(v => (
                <VulnCard key={v.id} v={v} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
