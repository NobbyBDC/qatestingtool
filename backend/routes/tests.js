const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Puppeteer v22+ is ESM-only — load via dynamic import inside the route handler

// Prefer system Chromium on Linux servers (avoids missing shared-library errors
// that occur with puppeteer's bundled Chrome on minimal server installs).
function findSystemChrome() {
  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome'
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

// Map frontend standard IDs → axe-core tag names
const STANDARD_TAGS = {
  wcag20a:   'wcag2a',
  wcag20aa:  'wcag2aa',
  wcag21aa:  'wcag21aa',
  wcag21aaa: 'wcag21aaa',
  best:      'best-practice',
  s508:      'section508'
};

// Extract the first WCAG criterion number from a violation's tags
function extractWcag(tags = []) {
  const match = tags.find(t => /^wcag\d/.test(t) && t.includes('.'));
  if (!match) return null;
  // e.g. "wcag143" → "1.4.3"
  const digits = match.replace(/^wcag/, '');
  return digits.replace(/(\d)(\d)(\d)?/, (_, a, b, c) => c ? `${a}.${b}.${c}` : `${a}.${b}`);
}

const router = express.Router();
router.use(authenticate, apiLimiter);

// Risk code → severity label (ZAP uses 0–3, no "CRITICAL" natively)
const ZAP_RISK = { 3: 'HIGH', 2: 'MEDIUM', 1: 'LOW', 0: 'INFO' };

// Poll a ZAP active scan until it reaches 100%
async function pollZapScan(zapBase, scanId, apiKey, maxMs = 180000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const r = await fetch(
      `${zapBase}/JSON/ascan/view/status/?scanId=${scanId}&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) continue;
    const { status } = await r.json();
    if (parseInt(status) >= 100) return;
  }
  throw new Error('ZAP scan timed out after 3 minutes');
}

// POST /api/tests/zap
router.post('/zap', async (req, res) => {
  const { url, apiKey } = req.body;
  if (!url) return res.status(400).json({ error: 'Target URL is required' });

  const zapBase   = process.env.ZAP_URL || 'http://localhost:8080';
  const zapKey    = apiKey || process.env.ZAP_API_KEY || 'changeme';
  const zapHeaders = { 'X-ZAP-API-Key': zapKey };

  try {
    // 1. Spider the target first (passive crawl)
    const spiderRes = await fetch(
      `${zapBase}/JSON/spider/action/scan/?url=${encodeURIComponent(url)}&apikey=${zapKey}`,
      { method: 'GET', headers: zapHeaders, signal: AbortSignal.timeout(10000) }
    );
    if (!spiderRes.ok) throw new Error('ZAP not reachable');
    const { scan: spiderId } = await spiderRes.json();

    // Wait for spider to finish (max 60s)
    const spiderDeadline = Date.now() + 60000;
    while (Date.now() < spiderDeadline) {
      await new Promise(r => setTimeout(r, 2000));
      const sr = await fetch(
        `${zapBase}/JSON/spider/view/status/?scanId=${spiderId}&apikey=${zapKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (sr.ok) {
        const { status } = await sr.json();
        if (parseInt(status) >= 100) break;
      }
    }

    // 2. Active scan
    const ascanRes = await fetch(
      `${zapBase}/JSON/ascan/action/scan/?url=${encodeURIComponent(url)}&recurse=true&apikey=${zapKey}`,
      { method: 'GET', headers: zapHeaders, signal: AbortSignal.timeout(10000) }
    );
    if (!ascanRes.ok) throw new Error('Could not start active scan');
    const { scan: scanId } = await ascanRes.json();
    await pollZapScan(zapBase, scanId, zapKey);

    // 3. Fetch alerts
    const alertsRes = await fetch(
      `${zapBase}/JSON/core/view/alerts/?baseurl=${encodeURIComponent(url)}&apikey=${zapKey}`,
      { headers: zapHeaders, signal: AbortSignal.timeout(10000) }
    );
    if (!alertsRes.ok) throw new Error('Could not fetch alerts');
    const { alerts } = await alertsRes.json();

    // 4. Shape into frontend format
    const RISK_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
    const vulnerabilities = alerts
      .map((a, i) => ({
        id:          `ZAP-${String(i + 1).padStart(3, '0')}`,
        name:        a.alert,
        severity:    ZAP_RISK[parseInt(a.riskcode)] || 'LOW',
        cwe:         a.cweid ? `CWE-${a.cweid}` : null,
        description: a.desc?.replace(/<[^>]+>/g, '').trim(),
        solution:    a.solution?.replace(/<[^>]+>/g, '').trim(),
        url:         a.url || url,
        confidence:  a.confidence
      }))
      .sort((a, b) => (RISK_ORDER[a.severity] ?? 4) - (RISK_ORDER[b.severity] ?? 4));

    const summary = vulnerabilities.reduce(
      (acc, v) => { acc[v.severity.toLowerCase()] = (acc[v.severity.toLowerCase()] || 0) + 1; return acc; },
      { high: 0, medium: 0, low: 0, info: 0 }
    );

    return res.json({
      scanId:   `ZAP-${Date.now()}`,
      status:   'completed',
      real:     true,
      url,
      timestamp: new Date().toISOString(),
      summary:  { total: vulnerabilities.length, critical: 0, ...summary },
      vulnerabilities
    });

  } catch (err) {
    // ZAP not running — fall back to demo data
    const isUnavailable = err.message.includes('not reachable') || err.code === 'ECONNREFUSED' || err.name === 'TimeoutError';
    if (!isUnavailable) return res.status(500).json({ error: err.message });

    res.json({
      scanId: `ZAP-DEMO-${Date.now()}`,
      status: 'completed',
      real:   false,
      url,
      timestamp: new Date().toISOString(),
      summary: { total: 6, critical: 0, high: 2, medium: 2, low: 2 },
      vulnerabilities: [
        { id: 'ZAP-001', name: 'Cross-Site Scripting (Reflected)', severity: 'HIGH', cwe: 'CWE-79', description: 'Reflected XSS found in search parameter. User-supplied input is returned in the response without encoding.', url: `${url}/search?q=test` },
        { id: 'ZAP-002', name: 'Missing Content-Security-Policy Header', severity: 'HIGH', cwe: 'CWE-693', description: 'Content-Security-Policy header is absent. Without CSP, browsers cannot restrict resource loading.', url },
        { id: 'ZAP-003', name: 'Session Cookie Without Secure Flag', severity: 'MEDIUM', cwe: 'CWE-614', description: 'Session cookie is missing the Secure attribute and may be sent over unencrypted connections.', url },
        { id: 'ZAP-004', name: 'Server Version Disclosure', severity: 'MEDIUM', cwe: 'CWE-200', description: 'Web server version is exposed in response headers. Attackers can use this to target known vulnerabilities.', url },
        { id: 'ZAP-005', name: 'X-Frame-Options Header Not Set', severity: 'LOW', cwe: 'CWE-1021', description: 'X-Frame-Options header is missing. The page may be embedded in an iframe enabling clickjacking attacks.', url },
        { id: 'ZAP-006', name: 'Outdated JavaScript Library', severity: 'LOW', cwe: 'CWE-1035', description: 'jQuery 1.12.4 detected. This version has multiple known vulnerabilities. Upgrade to the latest release.', url }
      ]
    });
  }
});

// Helpers for SonarQube scan
const RATING_MAP = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };

function getMeasure(measures, key) {
  return measures?.find(m => m.metric === key)?.value ?? null;
}

async function pollTask(baseUrl, taskId, sqHeaders, maxMs = 120000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));
    const r = await fetch(`${baseUrl}/api/ce/task?id=${taskId}`, { headers: sqHeaders });
    if (!r.ok) continue;
    const { task } = await r.json();
    if (task.status === 'SUCCESS') return;
    if (task.status === 'FAILED' || task.status === 'CANCELLED') {
      throw new Error(`Scan ${task.status.toLowerCase()}: ${task.errorMessage || 'unknown error'}`);
    }
  }
  throw new Error('Scan timed out waiting for SonarQube to finish analysis');
}

async function fetchMetrics(baseUrl, projectKey, sqHeaders) {
  const [metricsRes, gateRes, issuesRes] = await Promise.all([
    fetch(`${baseUrl}/api/measures/component?component=${projectKey}&metricKeys=ncloc,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,security_rating,reliability_rating,sqale_rating,sqale_index`, { headers: sqHeaders }),
    fetch(`${baseUrl}/api/qualitygates/project_status?projectKey=${projectKey}`, { headers: sqHeaders }),
    fetch(`${baseUrl}/api/issues/search?componentKeys=${projectKey}&resolved=false&ps=20`, { headers: sqHeaders })
  ]);

  const metricsData = metricsRes.ok ? await metricsRes.json() : {};
  const gateData    = gateRes.ok   ? await gateRes.json()    : {};
  const issuesData  = issuesRes.ok ? await issuesRes.json()  : {};
  const measures    = metricsData.component?.measures || [];

  const sqaleMin = parseInt(getMeasure(measures, 'sqale_index')) || 0;

  return {
    qualityGate: { status: gateData.projectStatus?.status || 'UNKNOWN' },
    metrics: {
      linesOfCode:          parseInt(getMeasure(measures, 'ncloc'))                      || 0,
      bugs:                 parseInt(getMeasure(measures, 'bugs'))                       || 0,
      vulnerabilities:      parseInt(getMeasure(measures, 'vulnerabilities'))            || 0,
      codeSmells:           parseInt(getMeasure(measures, 'code_smells'))               || 0,
      coverage:             parseFloat(getMeasure(measures, 'coverage'))                || 0,
      duplication:          parseFloat(getMeasure(measures, 'duplicated_lines_density'))|| 0,
      securityRating:       RATING_MAP[getMeasure(measures, 'security_rating')]         || '?',
      reliabilityRating:    RATING_MAP[getMeasure(measures, 'reliability_rating')]      || '?',
      maintainabilityRating:RATING_MAP[getMeasure(measures, 'sqale_rating')]            || '?',
      technicalDebt:        sqaleMin ? `${Math.floor(sqaleMin/60)}h ${sqaleMin%60}min` : '0min'
    },
    issues: (issuesData.issues || []).map(i => ({
      key:      i.key,
      type:     i.type,
      severity: i.severity,
      message:  i.message,
      file:     i.component?.split(':').pop() || i.component,
      line:     i.line
    }))
  };
}

// POST /api/tests/sonar
router.post('/sonar', async (req, res) => {
  const { sonarUrl, sonarToken, sonarOrg, repoUrl, githubToken, projectKey } = req.body;

  if (!repoUrl)    return res.status(400).json({ error: 'Repository URL is required' });
  if (!sonarToken) return res.status(400).json({ error: 'SonarQube token is required to run a scan' });

  const baseUrl      = (sonarUrl || 'https://sonarcloud.io').replace(/\/$/, '');
  const isSonarCloud = baseUrl.includes('sonarcloud.io');
  const sqHeaders    = { Authorization: `Bearer ${sonarToken}`, Accept: 'application/json' };

  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return res.status(400).json({ error: 'Invalid GitHub repository URL' });

  const [, owner, rawRepo] = match;
  const repoName    = rawRepo.replace(/\.git$/, '');
  const resolvedKey = projectKey || `${owner}_${repoName}`;
  const organization = sonarOrg || (isSonarCloud ? owner : null);

  const tmpDir = path.join(os.tmpdir(), `sonar-${Date.now()}`);

  try {
    // 1. Fetch GitHub metadata
    const ghHeaders = { Accept: 'application/vnd.github.v3+json' };
    if (githubToken) ghHeaders['Authorization'] = `token ${githubToken}`;
    let repoData = {};
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers: ghHeaders, signal: AbortSignal.timeout(10000) });
    if (ghRes.ok) repoData = await ghRes.json();

    // 2. Clone repo (shallow)
    fs.mkdirSync(tmpDir, { recursive: true });
    const { simpleGit } = require('simple-git');
    const cloneUrl = githubToken
      ? repoUrl.replace('https://', `https://x-access-token:${githubToken}@`).replace(/\.git$/, '') + '.git'
      : repoUrl.replace(/\.git$/, '') + '.git';
    await simpleGit().clone(cloneUrl, tmpDir, ['--depth', '1']);

    // 3. Run sonar-scanner
    const { scan } = require('sonarqube-scanner');
    const scanOptions = {
      'sonar.projectKey':     resolvedKey,
      'sonar.projectName':    repoData.full_name || `${owner}/${repoName}`,
      'sonar.sources':        '.',
      'sonar.projectBaseDir': tmpDir,
      'sonar.scm.disabled':   'true'
    };
    if (organization) scanOptions['sonar.organization'] = organization;

    await scan({ serverUrl: baseUrl, token: sonarToken, options: scanOptions });

    // 4. Read task ID from scanner report and poll until done
    const reportPath = path.join(tmpDir, '.scannerwork', 'report-task.txt');
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      const taskMatch     = reportContent.match(/ceTaskId=(.+)/);
      if (taskMatch) await pollTask(baseUrl, taskMatch[1].trim(), sqHeaders);
    }

    // 5. Fetch final metrics
    const { qualityGate, metrics, issues } = await fetchMetrics(baseUrl, resolvedKey, sqHeaders);

    res.json({
      projectKey:   resolvedKey,
      sonarUrl:     baseUrl,
      real:         true,
      repository: {
        owner, name: repoName,
        fullName:      repoData.full_name      || `${owner}/${repoName}`,
        description:   repoData.description    || null,
        language:      repoData.language       || 'Unknown',
        stars:         repoData.stargazers_count || 0,
        forks:         repoData.forks_count      || 0,
        openIssues:    repoData.open_issues_count || 0,
        defaultBranch: repoData.default_branch    || 'main'
      },
      timestamp: new Date().toISOString(),
      qualityGate, metrics, issues
    });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Scan failed' });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

// POST /api/tests/accessibility
router.post('/accessibility', async (req, res) => {
  const { url, standards = [] } = req.body;
  if (!url) return res.status(400).json({ error: 'Target URL is required' });

  let browser;
  try {
    const { default: puppeteer } = await import('puppeteer');
    const { AxePuppeteer } = await import('@axe-core/puppeteer');

    const executablePath = findSystemChrome();
    browser = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setBypassCSP(true);

    // Navigate with a 30s timeout; accept any HTTP status
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Build axe tag filter from selected standards
    const tags = standards
      .map(s => STANDARD_TAGS[s])
      .filter(Boolean);

    let scanner = new AxePuppeteer(page);
    if (tags.length > 0) scanner = scanner.withTags(tags);

    const axeResults = await scanner.analyze();
    await browser.close();
    browser = null;

    // Shape violations to match the frontend's expected format
    const violations = axeResults.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
      wcag: extractWcag(v.tags),
      howToFix: v.nodes[0]?.failureSummary?.replace(/^Fix (any|all) of the following:\s*/i, '') || v.description
    }));

    // Sort by impact severity
    const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    violations.sort((a, b) => (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4));

    const passes = axeResults.passes.map(v => ({
      id: v.id,
      description: v.description
    }));

    res.json({
      url,
      timestamp: new Date().toISOString(),
      standards,
      real: true,
      summary: {
        violations: violations.length,
        passes: passes.length,
        incomplete: axeResults.incomplete.length,
        inapplicable: axeResults.inapplicable.length
      },
      violations,
      passes
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    const msg = err.message || 'Accessibility scan failed';
    // Surface navigation errors clearly
    if (msg.includes('net::') || msg.includes('Navigation timeout')) {
      return res.status(400).json({ error: `Could not reach "${url}". Check the URL is publicly accessible.` });
    }
    res.status(500).json({ error: msg });
  }
});

// POST /api/tests/seo
router.post('/seo', async (req, res) => {
  const { url, options = {}, apiKey: userApiKey } = req.body;
  if (!url) return res.status(400).json({ error: 'Target URL is required' });

  // User-supplied key takes priority; fall back to server env key
  const apiKey = userApiKey || process.env.PAGESPEED_API_KEY;
  try {
    if (!apiKey) throw new Error('No API key');

    const strategies = [];
    if (options.mobile !== false) strategies.push('mobile');
    if (options.desktop !== false) strategies.push('desktop');

    const results = {};
    for (const strategy of strategies) {
      const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${apiKey}&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`;
      const r = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
      if (r.ok) results[strategy] = await r.json();
    }
    return res.json({ url, timestamp: new Date().toISOString(), real: true, results });
  } catch {
    // Demo data
    res.json({
      url,
      timestamp: new Date().toISOString(),
      real: false,
      scores: { mobile: 62, desktop: 89, seo: 94, accessibility: 78, bestPractices: 83 },
      coreWebVitals: {
        lcp: { value: 2.4, unit: 's', status: 'needs-improvement', label: 'Largest Contentful Paint', thresholds: { good: 2.5, poor: 4.0 } },
        fid: { value: 85, unit: 'ms', status: 'good', label: 'First Input Delay', thresholds: { good: 100, poor: 300 } },
        cls: { value: 0.08, unit: '', status: 'good', label: 'Cumulative Layout Shift', thresholds: { good: 0.1, poor: 0.25 } },
        ttfb: { value: 620, unit: 'ms', status: 'needs-improvement', label: 'Time to First Byte', thresholds: { good: 800, poor: 1800 } },
        fcp: { value: 1.2, unit: 's', status: 'good', label: 'First Contentful Paint', thresholds: { good: 1.8, poor: 3.0 } },
        tbt: { value: 280, unit: 'ms', status: 'needs-improvement', label: 'Total Blocking Time', thresholds: { good: 200, poor: 600 } }
      },
      pageStats: {
        loadTime: '3.2s',
        pageSize: '2.4 MB',
        requests: 67,
        htmlSize: '48 KB',
        cssSize: '180 KB',
        jsSize: '1.2 MB',
        imageSize: '890 KB'
      },
      issues: [
        { title: 'Eliminate render-blocking resources', impact: 'HIGH', status: 'failed', fix: 'Defer or async-load CSS/JS that blocks the first paint. Move critical styles inline.' },
        { title: 'Serve images in next-gen formats', impact: 'HIGH', status: 'failed', fix: 'Convert images to WebP or AVIF. They provide better compression than PNG/JPEG.' },
        { title: 'Properly size images', impact: 'HIGH', status: 'failed', fix: 'Serve images at the dimensions they are displayed. Use srcset for responsive images.' },
        { title: 'Minify JavaScript', impact: 'MEDIUM', status: 'failed', fix: 'Enable minification in your build tool (Webpack/Vite). Removes whitespace and comments.' },
        { title: 'Enable text compression', impact: 'MEDIUM', status: 'failed', fix: 'Enable Gzip or Brotli compression on your server. Typically reduces transfer by 60-80%.' },
        { title: 'Reduce unused JavaScript', impact: 'MEDIUM', status: 'failed', fix: 'Use code splitting and tree-shaking to remove unused code from bundles.' },
        { title: 'Add meta description', impact: 'LOW', status: 'passed', fix: '' },
        { title: 'Page has valid hreflang', impact: 'LOW', status: 'passed', fix: '' },
        { title: 'Document uses legible font sizes', impact: 'LOW', status: 'passed', fix: '' }
      ]
    });
  }
});

module.exports = router;
