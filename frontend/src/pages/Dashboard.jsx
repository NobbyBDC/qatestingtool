import { Link } from 'react-router-dom';
import { Shield, Code2, Eye, Search, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MODULES = [
  {
    path: '/security',
    icon: Shield,
    label: 'ZAP Security Scanner',
    description: 'OWASP ZAP integration for vulnerability scanning. Detects SQL injection, XSS, insecure headers, and more.',
    badge: 'Security',
    accent: {
      border: 'border-red-500/20 hover:border-red-500/40',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      badge: 'bg-red-500/15 text-red-300',
      arrow: 'group-hover:text-red-400'
    }
  },
  {
    path: '/sonarqube',
    icon: Code2,
    label: 'SonarQube Analysis',
    description: 'Code quality metrics, bug and vulnerability detection, test coverage, and maintainability ratings.',
    badge: 'Code Quality',
    accent: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      badge: 'bg-blue-500/15 text-blue-300',
      arrow: 'group-hover:text-blue-400'
    }
  },
  {
    path: '/accessibility',
    icon: Eye,
    label: 'Accessibility Tester',
    description: 'WCAG 2.0/2.1 compliance checks via axe-core. Identify contrast failures, missing labels, and aria issues.',
    badge: 'WCAG',
    accent: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      badge: 'bg-purple-500/15 text-purple-300',
      arrow: 'group-hover:text-purple-400'
    }
  },
  {
    path: '/seo',
    icon: Search,
    label: 'SEO & Performance Audit',
    description: 'Google PageSpeed Insights integration. Core Web Vitals, performance scores, and actionable SEO recommendations.',
    badge: 'Performance',
    accent: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300',
      arrow: 'group-hover:text-emerald-400'
    }
  }
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-white">
            Welcome back, <span className="text-cyan-400">{user?.username}</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm">
          Select a testing module to run an audit on your web application.
        </p>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULES.map(mod => (
          <Link
            key={mod.path}
            to={mod.path}
            className={`group bg-slate-900 rounded-2xl border ${mod.accent.border} p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl ${mod.accent.iconBg} flex items-center justify-center`}>
                <mod.icon className={`w-5 h-5 ${mod.accent.iconColor}`} />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${mod.accent.badge}`}>
                {mod.badge}
              </span>
            </div>

            <h3 className="font-semibold text-white mb-1.5">{mod.label}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{mod.description}</p>

            <div className={`flex items-center gap-1.5 mt-4 text-xs font-medium text-slate-500 ${mod.accent.arrow} transition-colors`}>
              Open module
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
