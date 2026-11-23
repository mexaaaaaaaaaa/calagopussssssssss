import React from 'react';
import {
  CheckCircle2,
  Download,
  FileJson,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { CalagopusConsoleLine } from '../api/calagopusCore';
import type { CalagopusServerSummary } from '../api/calagopusDashboard';
import type { CalagopusAdminExtension, CalagopusAdminNode } from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { ErrorState } from '../components/FeedbackStates';
import { SearchField, SelectDropdown, Textarea } from '../components/FormControls';
import { showToast } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';
import { hasPermission, type CalagopusUserContext } from '../navigation/calagopusRoutes';
import {
  analyzeCrashLogs,
  PROMPT_21_FEATURE_MATRIX,
  redactSensitiveDiagnosticData,
  type FeatureSupportLevel,
  type PracticalFeatureDescriptor,
} from '../utils/petalnodesFeatures';

export interface AdminDiagnosticsPageProps {
  user: CalagopusUserContext;
  nodes: readonly CalagopusAdminNode[];
  servers: readonly CalagopusServerSummary[];
  extensions: readonly CalagopusAdminExtension[];
  consoleLogs?: readonly CalagopusConsoleLine[];
  isLiveMode?: boolean;
  onNavigate: (path: string) => void;
}

const API_REFERENCE_ENDPOINTS = [
  { id: 'api-1', scope: 'Client', method: 'GET', endpoint: '/api/client/account', purpose: 'Authenticated user profile, email, 2FA, and permissions' },
  { id: 'api-2', scope: 'Client', method: 'GET', endpoint: '/api/client/servers/:id', purpose: 'Live Wings telemetry, state, allocation, and SFTP endpoint' },
  { id: 'api-3', scope: 'Client', method: 'POST', endpoint: '/api/client/servers/:id/power', purpose: 'Start, stop, restart, or kill server container' },
  { id: 'api-4', scope: 'Client', method: 'POST', endpoint: '/api/client/servers/:id/files/write', purpose: 'Write server.properties, eula.txt, whitelist.json, or configs' },
  { id: 'api-5', scope: 'Admin', method: 'GET', endpoint: '/api/admin/nodes', purpose: 'Wings node health, FQDN, memory, and disk allocation quotas' },
  { id: 'api-6', scope: 'Admin', method: 'POST', endpoint: '/api/admin/servers', purpose: 'Provision new Egg-based game or application server container' },
];

export function AdminDiagnosticsPage({
  user,
  nodes,
  servers,
  extensions,
  consoleLogs = [],
  isLiveMode = false,
  onNavigate,
}: AdminDiagnosticsPageProps) {
  const [featureQuery, setFeatureQuery] = React.useState('');
  const [supportFilter, setSupportFilter] = React.useState<'all' | FeatureSupportLevel>('all');
  const [aiPrompt, setAiPrompt] = React.useState(
    'Analyze recent server logs and summarize any resource bottlenecks or configuration issues.',
  );
  const [aiResponse, setAiResponse] = React.useState<string | null>(null);
  const [aiNotice, setAiNotice] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  const redactedBundle = React.useMemo(
    () =>
      redactSensitiveDiagnosticData({
        generatedAt: new Date().toISOString(),
        mode: isLiveMode ? 'live-calagopus-api' : 'sandbox-preview',
        operator: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
        nodesCount: nodes.length,
        serversCount: servers.length,
        extensions: extensions.map((e) => ({ identifier: e.identifier, status: e.status, version: e.version })),
        crashFindings: analyzeCrashLogs(consoleLogs),
      }),
    [user, isLiveMode, nodes.length, servers.length, extensions, consoleLogs],
  );

  const filteredFeatures = React.useMemo(() => {
    const q = featureQuery.trim().toLowerCase();
    return PROMPT_21_FEATURE_MATRIX.filter((f) => {
      if (supportFilter !== 'all' && f.support !== supportFilter) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        String(f.number).includes(q)
      );
    }).map((f) => ({ ...f, id: `feature-${f.number}` }));
  }, [featureQuery, supportFilter]);

  if (!canAccessAdmin && !hasPermission(user, 'admin.overview')) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Diagnostics" description="Panel diagnostics and feature compatibility." />
        <ErrorState
          title="Administrator permission required"
          description="Your role does not have access to infrastructure diagnostics."
          retryLabel="Return to Workspace"
          onRetry={() => onNavigate('/')}
        />
      </div>
    );
  }

  const handleDownloadDiagnostics = () => {
    const blob = new Blob([JSON.stringify(redactedBundle, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petalnodes-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast({
      title: 'Diagnostics exported',
      message: 'Downloaded redacted diagnostic JSON bundle (tokens and emails masked).',
      tone: 'success',
    });
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiNotice(null);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          context: redactedBundle,
        }),
      });
      const data = (await res.json()) as {
        configured?: boolean;
        answer?: string;
        error?: string;
      };
      if (!res.ok) {
        if (data.configured === false) {
          setAiNotice(
            data.error ??
              'GEMINI_API_KEY is not configured on the Express backend. Set it in your environment to enable optional AI log diagnostics.',
          );
        } else {
          setAiNotice(data.error ?? 'AI diagnostics request failed.');
        }
        return;
      }
      setAiResponse(data.answer ?? 'No response returned.');
    } catch {
      setAiNotice(
        'Could not reach /api/ai/assist backend endpoint. Deterministic crash analysis remains available below.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  const featureCols: readonly TableColumn<PracticalFeatureDescriptor & { id: string }>[] = [
    {
      key: 'number',
      header: '#',
      numeric: true,
      render: (f) => <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">{f.number}</span>,
    },
    { key: 'category', header: 'Category' },
    {
      key: 'name',
      header: 'Feature',
      render: (f) => <span className="font-medium text-[var(--calagopus-text)]">{f.name}</span>,
    },
    {
      key: 'support',
      header: 'Backend Status',
      render: (f) => (
        <StatusBadge
          tone={
            f.support === 'supported'
              ? 'success'
              : f.support === 'panel-file-api'
                ? 'pink'
                : f.support === 'backend-required'
                  ? 'warning'
                  : 'neutral'
          }
          label={
            f.support === 'supported'
              ? 'Native Calagopus'
              : f.support === 'panel-file-api'
                ? 'Panel File API'
                : f.support === 'backend-required'
                  ? 'Optional Env Key'
                  : 'Preview Only'
          }
        />
      ),
    },
  ];

  return (
    <div className="blush-page-enter space-y-6">
      <PageHeader
        title="System Diagnostics & Developer Reference"
        description="Redacted bundle export, Calagopus REST API reference, 50-feature compatibility matrix, and optional AI diagnostics."
        metadata={[isLiveMode ? 'Live Calagopus API' : 'Sandbox Preview', `${extensions.length} extensions`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={handleDownloadDiagnostics}
          >
            Export Redacted Bundle
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Native Panel Features"
          value={PROMPT_21_FEATURE_MATRIX.filter((f) => f.support === 'supported').length}
          helper="Backed by standard Calagopus APIs"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="File-API Driven Tools"
          value={PROMPT_21_FEATURE_MATRIX.filter((f) => f.support === 'panel-file-api').length}
          helper="Uses /files/write, /files/rename & console"
          icon={<Wrench className="h-4 w-4" />}
        />
        <StatCard
          label="Sensitive Fields Masked"
          value="Enabled"
          helper="Tokens, passwords, & emails auto-redacted"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Active Crash Findings"
          value={redactedBundle.crashFindings.length}
          helper="Scanned from recent console output"
          icon={<FileJson className="h-4 w-4" />}
        />
      </div>

      {/* Optional Server-Side AI Troubleshooting Assistant + Redacted Snapshot */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Optional AI Log Troubleshooting Assistant"
          description="Queries server-side /api/ai/assist with redacted diagnostic metadata only. Requires GEMINI_API_KEY."
          headerAction={<Sparkles className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          <form onSubmit={handleAskAssistant} className="space-y-3">
            <Textarea
              label="Diagnostic Question"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.currentTarget.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-[var(--calagopus-text-secondary)]">
                Keys, tokens, and emails are stripped client-side before sending.
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={aiLoading}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Analyze
              </Button>
            </div>
            {aiNotice ? (
              <div
                role="status"
                className="rounded-lg border border-[var(--calagopus-warning-border)] bg-[var(--calagopus-warning-bg)] p-3 text-[12.5px] text-[var(--calagopus-warning-text)]"
              >
                {aiNotice}
              </div>
            ) : null}
            {aiResponse ? (
              <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5 text-[13px] text-[var(--calagopus-text)] whitespace-pre-wrap leading-relaxed">
                {aiResponse}
              </div>
            ) : null}
          </form>
        </Card>

        <Card
          title="Redacted Diagnostic Bundle Preview"
          description="Preview of the sanitized JSON snapshot exported for support or issue reports."
        >
          <pre className="max-h-72 overflow-auto rounded-lg border border-[var(--calagopus-border)] bg-[#14131A] p-3.5 font-mono text-[11.5px] text-[#FFF8FA]">
            {JSON.stringify(redactedBundle, null, 2)}
          </pre>
        </Card>
      </div>

      {/* 50-Feature Compatibility Matrix */}
      <Card
        title="50-Feature Capability & Backend Compatibility Matrix"
        description="Complete audit of practical features and their Calagopus API backing."
        headerAction={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-60">
              <SearchField
                aria-label="Filter features"
                placeholder="Filter 50 features..."
                value={featureQuery}
                onChange={setFeatureQuery}
              />
            </div>
            <div className="w-full sm:w-44">
              <SelectDropdown
                aria-label="Filter support status"
                value={supportFilter}
                onChange={(v) => setSupportFilter((v as 'all' | FeatureSupportLevel) ?? 'all')}
                data={[
                  { value: 'all', label: 'All capabilities' },
                  { value: 'supported', label: 'Native Calagopus' },
                  { value: 'panel-file-api', label: 'Panel File API' },
                  { value: 'backend-required', label: 'Optional Env Key' },
                ]}
              />
            </div>
          </div>
        }
      >
        <DataTable
          caption="50 Feature Matrix"
          compact
          columns={featureCols}
          rows={filteredFeatures}
          renderActions={(f) => (
            <Button variant="secondary" size="sm" onClick={() => onNavigate(f.route)}>
              Open
            </Button>
          )}
        />
      </Card>

      {/* Calagopus REST API Quick Reference */}
      <Card
        title="Calagopus API Quick Reference"
        description="Core client and admin REST endpoints wired into cloud.petalnodes.sanctuary."
      >
        <DataTable
          caption="Calagopus API Reference"
          compact
          columns={[
            { key: 'scope', header: 'Scope' },
            {
              key: 'method',
              header: 'Method',
              render: (r) => <StatusBadge tone="pink" label={r.method} showIcon={false} />,
            },
            {
              key: 'endpoint',
              header: 'Endpoint',
              render: (r) => <code className="font-mono text-[12px]">{r.endpoint}</code>,
            },
            { key: 'purpose', header: 'Purpose' },
          ]}
          rows={API_REFERENCE_ENDPOINTS}
        />
      </Card>
    </div>
  );
}
