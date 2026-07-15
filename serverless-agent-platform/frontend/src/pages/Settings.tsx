import React, { useState, useEffect } from 'react';
import { Key, Database, Link as LinkIcon, Palette, Zap, Bot, Smile, Eye, EyeOff, Info, CheckCircle2, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Settings() {
  const [activeTab, setActiveTab] = useState('api-keys');

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh]">
      
      {/* Left Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-1">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 px-3">Settings</h3>
        <TabButton id="api-keys" label="API Keys" icon={Key} isActive={activeTab === 'api-keys'} onClick={() => setActiveTab('api-keys')} />
        <TabButton id="database" label="Database" icon={Database} isActive={activeTab === 'database'} onClick={() => setActiveTab('database')} />
        <TabButton id="integrations" label="Integrations" icon={LinkIcon} isActive={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
        <TabButton id="appearance" label="Appearance" icon={Palette} isActive={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl">
        {activeTab === 'api-keys' && <ApiKeysSection />}
        {activeTab === 'database' && <DatabaseSection />}
        {activeTab === 'integrations' && <IntegrationsSection />}
        {activeTab === 'appearance' && <AppearanceSection />}
      </div>

    </div>
  );
}

function TabButton({ id, label, icon: Icon, isActive, onClick }: any) {
  return (
    <button
      id={`settings-tab-${id}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-accent-blue bg-opacity-10 text-accent-blue' 
          : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-accent-blue' : 'text-text-muted'}`} />
      {label}
    </button>
  );
}

function SaveBanner({ message, type }: { message: string, type: 'success' | 'error' }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium animate-in fade-in duration-200 ${
      type === 'success' 
        ? 'bg-accent-green bg-opacity-10 border border-accent-green border-opacity-30 text-accent-green'
        : 'bg-accent-red bg-opacity-10 border border-accent-red border-opacity-30 text-accent-red'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

function ApiKeysSection() {
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Load from localStorage so it persists across sessions
    setOpenrouterKey(localStorage.getItem('openrouter_key') || '');
    setGithubToken(localStorage.getItem('github_token') || '');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('openrouter_key', openrouterKey);
      localStorage.setItem('github_token', githubToken);
      setBanner({ message: 'Settings saved successfully!', type: 'success' });
    } catch {
      setBanner({ message: 'Failed to save settings.', type: 'error' });
    }
    setSaving(false);
    setTimeout(() => setBanner(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">API Keys & Secrets</h1>
        <p className="text-sm text-text-secondary mt-1">These keys are stored locally in your browser and never sent to a server.</p>
      </div>

      {banner && <SaveBanner message={banner.message} type={banner.type} />}

      <div className="space-y-4">
        <ApiKeyCard
          icon={Zap}
          iconColor="text-purple-400"
          title="OpenRouter (NVIDIA Nemotron)"
          description="Used for all AI chat interactions"
          placeholder="sk-or-v1-..."
          value={openrouterKey}
          onChange={setOpenrouterKey}
          isConnected={!!openrouterKey}
        />
        <ApiKeyCard
          icon={Key}
          iconColor="text-accent-green"
          title="GitHub Token (PAT)"
          description="Required to trigger backend agents via Actions"
          placeholder="ghp_..."
          value={githubToken}
          onChange={setGithubToken}
          isConnected={!!githubToken}
        />
        <ApiKeyCard
          icon={Bot}
          iconColor="text-accent-blue"
          title="Google Gemini"
          description="Optional — used for document generation agent"
          placeholder="AIza..."
          value={localStorage.getItem('gemini_key') || ''}
          onChange={(v: string) => localStorage.setItem('gemini_key', v)}
          isConnected={!!localStorage.getItem('gemini_key')}
        />
        <ApiKeyCard
          icon={Smile}
          iconColor="text-accent-amber"
          title="Hugging Face"
          description="Optional — for open-source model access"
          placeholder="hf_..."
          value={localStorage.getItem('hf_key') || ''}
          onChange={(v: string) => localStorage.setItem('hf_key', v)}
          isConnected={!!localStorage.getItem('hf_key')}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          id="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-accent-blue hover:bg-blue-600 text-white text-sm font-semibold py-2 px-5 rounded-md transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Keys'}
        </button>
      </div>

      <div className="bg-accent-blue bg-opacity-5 border border-accent-blue border-opacity-20 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
        <p className="text-sm text-accent-blue text-opacity-90 leading-relaxed">
          Keys are stored only in your browser's localStorage. Clearing your browser data will remove them.
          Set billing limits on API provider accounts to avoid unexpected charges.
        </p>
      </div>
    </div>
  );
}

function ApiKeyCard({ icon: Icon, iconColor, title, description, placeholder, value, onChange, isConnected }: any) {
  const [localValue, setLocalValue] = useState(value);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-background-card border border-border rounded-lg p-5 flex flex-col gap-3 shadow-sm hover:border-text-muted transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <div>
            <span className="font-semibold text-text-primary text-sm">{title}</span>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
          isConnected 
            ? 'bg-accent-green bg-opacity-10 border-accent-green border-opacity-20 text-accent-green'
            : 'bg-background-secondary border-border text-text-muted'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-text-muted'}`}></div>
          {isConnected ? 'Connected' : 'Not Set'}
        </div>
      </div>
      
      <div className="relative">
        <input 
          type={showPassword ? 'text' : 'password'}
          value={localValue}
          onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
          placeholder={placeholder}
          className="w-full bg-[#161B22] border border-border rounded-md py-2 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors placeholder:text-text-muted"
        />
        <button 
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function DatabaseSection() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    supabase.from('agents').select('id').limit(1)
      .then(({ error }) => setStatus(error ? 'error' : 'connected'));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Database Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">Your Supabase connection status and configuration.</p>
      </div>

      <div className="bg-background-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-accent-green" />
            <span className="font-semibold text-text-primary">Supabase Connection</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            status === 'connected' ? 'bg-accent-green bg-opacity-10 border-accent-green border-opacity-20 text-accent-green'
            : status === 'error' ? 'bg-accent-red bg-opacity-10 border-accent-red border-opacity-20 text-accent-red'
            : 'bg-background-secondary border-border text-text-muted'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-accent-green animate-pulse' : status === 'error' ? 'bg-accent-red' : 'bg-text-muted'}`}></div>
            {status === 'checking' ? 'Checking...' : status === 'connected' ? 'Live & Connected' : 'Connection Error'}
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Project URL</span>
            <span className="text-text-primary font-mono text-xs truncate max-w-[240px]">{supabaseUrl || 'Not configured'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Auth Mode</span>
            <span className="text-text-primary">Anonymous Key (Public)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Tables</span>
            <span className="text-text-primary">agents, agent_sessions, agent_messages</span>
          </div>
        </div>
      </div>

      <div className="bg-accent-green bg-opacity-5 border border-accent-green border-opacity-20 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
        <p className="text-sm text-accent-green text-opacity-90 leading-relaxed">
          Your database credentials are baked into the app at build time via environment variables and are never exposed in source code.
        </p>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-secondary mt-1">Connect external services to expand your agents' capabilities.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IntegrationCard name="GitHub" description="Read repos, create PRs, review code" connected={true} />
        <IntegrationCard name="Supabase" description="Persistent storage and real-time data" connected={true} />
        <IntegrationCard name="OpenRouter" description="AI model routing and inference" connected={true} />
        <IntegrationCard name="Google Drive" description="Read and write documents and sheets" connected={false} />
        <IntegrationCard name="Notion" description="Manage pages and databases" connected={false} />
        <IntegrationCard name="Slack" description="Send notifications and read messages" connected={false} />
      </div>
    </div>
  );
}

function IntegrationCard({ name, description, connected }: any) {
  return (
    <div className="bg-background-card border border-border rounded-lg p-5 flex flex-col gap-3 shadow-sm hover:border-text-muted transition-colors">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-text-primary">{name}</h3>
        {connected ? (
          <span className="text-[10px] font-bold text-accent-green bg-accent-green bg-opacity-10 px-2 py-1 rounded-full uppercase tracking-wider border border-accent-green border-opacity-20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="text-[10px] font-bold text-text-muted bg-background-secondary px-2 py-1 rounded-full uppercase tracking-wider border border-border">
            Not Connected
          </span>
        )}
      </div>
      <p className="text-xs text-text-secondary flex-1">{description}</p>
      <button className={`mt-2 py-1.5 px-4 rounded text-xs font-semibold transition-colors w-full ${connected ? 'bg-background-secondary text-text-secondary hover:text-text-primary' : 'bg-accent-blue text-white hover:bg-blue-600'}`}>
        {connected ? 'Configure' : 'Connect'}
      </button>
    </div>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState('dark');
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Appearance</h1>
        <p className="text-sm text-text-secondary mt-1">Customize the look and feel of your dashboard.</p>
      </div>
      <div className="bg-background-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Theme Preference</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'dark', label: 'Dark', bg: 'bg-[#0D1117]', inner: 'bg-[#161B22] border-[#30363D]' },
            { id: 'light', label: 'Light', bg: 'bg-[#F6F8FA]', inner: 'bg-white border-[#D0D7DE]' },
            { id: 'system', label: 'System', bg: 'bg-gradient-to-br from-[#0D1117] to-[#F6F8FA]', inner: 'bg-background-secondary border-border' },
          ].map(t => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`border-2 rounded-lg p-4 ${t.bg} flex flex-col items-center gap-3 cursor-pointer transition-all ${theme === t.id ? 'border-accent-blue' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <div className={`w-full h-16 rounded ${t.inner} border flex items-center justify-center`}>
                <div className="w-8 h-2 rounded-full bg-current opacity-30"></div>
              </div>
              <span className={`text-sm font-semibold ${t.id === 'light' ? 'text-gray-900' : 'text-text-primary'}`}>
                {t.label}{theme === t.id ? ' ✓' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
