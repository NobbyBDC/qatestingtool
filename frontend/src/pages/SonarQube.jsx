import { useState } from 'react';
import { Code2, Play, AlertCircle, Download, ExternalLink } from 'lucide-react';
import api from '../api/client';

const RATING_COLOR = { A: 'text-green-400', B: 'text-lime-400', C: 'text-yellow-400', D: 'text-red-400' };
const RATING_BG    = { A: 'bg-green-500/10 border-green-500/20', B: 'bg-lime-500/10 border-lime-500/20', C: 'bg-yellow-500/10 border-yellow-500/20', D: 'bg-red-500/10 border-red-500/20' };

const ISSUE_SEV = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  MAJOR:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MINOR:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  INFO:     'text-slate-400 bg-slate-500/10 border-slate-500/20'
};

const ISSUE_TYPE = {
  BUG:          { label: 'Bug',           color: 'text-red-400' },
  VULNERABILITY: { label: 'Vulnerability', color: 'text-orange-400' },
  CODE_SMELL:   { label: 'Code Smell',    color: 'text-yellow-400' }
};

function RatingCard({ label, value }) {
  const color = RATING_COLOR[value] || 'text-slate-400';
  const bg = RATING_BG[value] || 'bg-slate-800 border-slate-700';
  return (
    <div className={`rounded-xl border p-4 text-center ${bg}`}>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

export default function SonarQube() {
  const [sonarUrl, setSonarUrl] = useState('https://sonarcloud.io');
  const [sonarToken, setSonarToken] = useState('');
  const [sonarOrg, setSonarOrg] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('Starting scan…');
    setResults(null);
    try {
      const { data } = await api.post('/tests/sonar', {
        sonarUrl: sonarUrl || 'https://sonarcloud.io',
        sonarToken: sonarToken || undefined,
        sonarOrg: sonarOrg || undefined,
        repoUrl,
        githubToken: githubToken || undefined,
        projectKey: projectKey || undefined
      }, { timeout: 300000 }); // 5 min — scan can take time
      setResults(data);
      setStatus('');
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sonar-report-${Date.now()}.json`;
    a.click();
  };

  const m = results?.metrics;
  const gateColor = results?.qualityGate?.status === 'PASSED' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className="fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">SonarQube Analysis</h1>
          <p className="text-xs text-slate-400">Code quality, bugs, vulnerabilities &amp; coverage</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
        <form onSubmit={run} className="space-y-4">

          {/* SonarQube server */}
          <div className="pb-4 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SonarQube / SonarCloud</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">SonarQube URL</label>
                <input
                  type="url"
                  value={sonarUrl}
                  onChange={e => setSonarUrl(e.target.value)}
                  placeholder="https://sonarcloud.io"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">SonarCloud: <span className="font-mono">https://sonarcloud.io</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  SonarQube Token <span className="text-slate-500 font-normal">(required)</span>
                </label>
                <input
                  type="password"
                  value={sonarToken}
                  onChange={e => setSonarToken(e.target.value)}
                  placeholder="squ_xxxxxxxxxxxx"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Organization <span className="text-slate-500 font-normal">(SonarCloud only)</span>
                </label>
                <input
                  type="text"
                  value={sonarOrg}
                  onChange={e => setSonarOrg(e.target.value)}
                  placeholder="my-github-org"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* GitHub repo */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">GitHub Repository</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Repository URL</label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    GitHub Token{' '}
                    <span className="text-slate-500 font-normal">(private repos)</span>
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Project Key{' '}
                    <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={projectKey}
                    onChange={e => setProjectKey(e.target.value)}
                    placeholder="my-org_my-repo"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" /> Running…</>
                : <><Play className="w-3.5 h-3.5" /> Run Analysis</>
              }
            </button>
            {loading && status && (
              <span className="text-xs text-slate-400 animate-pulse">{status}</span>
            )}
            {loading && (
              <span className="text-xs text-slate-500">This may take 1–3 minutes</span>
            )}
          </div>
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
          {/* Repo info + quality gate */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-white">{results.repository?.fullName || results.projectKey}</h2>
                {results.repository?.description && (
                  <p className="text-sm text-slate-400 mt-0.5">{results.repository.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  {results.repository?.language && <span>{results.repository.language}</span>}
                  {results.repository?.stars !== undefined && <span>★ {results.repository.stars.toLocaleString()}</span>}
                  {results.sonarUrl && <span className="font-mono">{results.sonarUrl}</span>}
                  {!results.real && (
                    <span className="text-yellow-500">(demo data — add SonarQube token for real metrics)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold px-3 py-1.5 rounded-xl border ${gateColor}`}>
                  Quality Gate: {results.qualityGate?.status}
                </span>
                <button
                  onClick={download}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>
          </div>

          {/* Ratings */}
          {m && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Ratings</h3>
              <div className="grid grid-cols-3 gap-3">
                <RatingCard label="Security Rating" value={m.securityRating} />
                <RatingCard label="Reliability Rating" value={m.reliabilityRating} />
                <RatingCard label="Maintainability Rating" value={m.maintainabilityRating} />
              </div>
            </div>
          )}

          {/* Metrics grid */}
          {m && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <MetricCard label="Lines of Code" value={m.linesOfCode?.toLocaleString()} />
                <MetricCard label="Bugs" value={m.bugs} color={m.bugs > 0 ? 'text-red-400' : 'text-green-400'} />
                <MetricCard label="Vulnerabilities" value={m.vulnerabilities} color={m.vulnerabilities > 0 ? 'text-orange-400' : 'text-green-400'} />
                <MetricCard label="Code Smells" value={m.codeSmells} color={m.codeSmells > 0 ? 'text-yellow-400' : 'text-green-400'} />
                <MetricCard label="Test Coverage" value={`${m.coverage}%`} color={m.coverage >= 80 ? 'text-green-400' : m.coverage >= 60 ? 'text-yellow-400' : 'text-red-400'} />
                <MetricCard label="Duplication" value={`${m.duplication}%`} color={m.duplication <= 5 ? 'text-green-400' : 'text-yellow-400'} />
                <MetricCard label="Technical Debt" value={m.technicalDebt} />
              </div>
            </div>
          )}

          {/* Issues */}
          {results.issues?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Issues ({results.issues.length})</h3>
              <div className="space-y-2">
                {results.issues.map(issue => {
                  const type = ISSUE_TYPE[issue.type] || { label: issue.type, color: 'text-slate-400' };
                  const sev = ISSUE_SEV[issue.severity] || ISSUE_SEV.INFO;
                  return (
                    <div key={issue.key} className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${type.color}`}>{type.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${sev}`}>
                            {issue.severity}
                          </span>
                          <span className="text-xs font-mono text-slate-500">{issue.key}</span>
                        </div>
                        <p className="text-sm text-slate-200">{issue.message}</p>
                        <p className="text-xs font-mono text-slate-500 mt-1">
                          {issue.file}:{issue.line}
                        </p>
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
