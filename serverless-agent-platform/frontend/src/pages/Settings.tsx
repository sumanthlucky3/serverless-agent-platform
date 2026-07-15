import React, { useState } from 'react';
import { Key, Database, Link as LinkIcon, Palette, Zap, Bot, Smile, Eye, EyeOff, Info, CheckCircle2 } from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('api-keys');

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh]">
      
      {/* Left Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-1">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 px-3">Settings</h3>
        <TabButton 
          id="api-keys" 
          label="API Keys" 
          icon={Key} 
          isActive={activeTab === 'api-keys'} 
          onClick={() => setActiveTab('api-keys')} 
        />
        <TabButton 
          id="database" 
          label="Database Configuration" 
          icon={Database} 
          isActive={activeTab === 'database'} 
          onClick={() => setActiveTab('database')} 
        />
        <TabButton 
          id="integrations" 
          label="Integrations" 
          icon={LinkIcon} 
          isActive={activeTab === 'integrations'} 
          onClick={() => setActiveTab('integrations')} 
        />
        <TabButton 
          id="appearance" 
          label="Appearance" 
          icon={Palette} 
          isActive={activeTab === 'appearance'} 
          onClick={() => setActiveTab('appearance')} 
        />
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

// ----------------- SUBCOMPONENTS -----------------

function TabButton({ id, label, icon: Icon, isActive, onClick }: any) {
  return (
    <button
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

function ApiKeysSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">API Keys & Secrets</h1>
        <p className="text-sm text-text-secondary mt-1">
          These keys are stored locally and never sent to a central server.
        </p>
      </div>

      <div className="space-y-4">
        {/* Groq API Card */}
        <ApiKeyCard 
          icon={Zap} 
          iconColor="text-accent-amber"
          title="Groq API" 
          placeholder="Enter Groq API Key"
          initialValue="gsk_**************************************"
          isConnected={true}
        />

        {/* Google Gemini Card */}
        <ApiKeyCard 
          icon={Bot} 
          iconColor="text-accent-blue"
          title="Google Gemini" 
          placeholder="Enter Gemini API Key"
          initialValue=""
          isConnected={false}
        />

        {/* Hugging Face Card */}
        <ApiKeyCard 
          icon={Smile} 
          iconColor="text-accent-amber"
          title="Hugging Face" 
          placeholder="Enter HF Token"
          initialValue=""
          isConnected={false}
        />
      </div>

      {/* Warning Banner */}
      <div className="mt-8 bg-accent-blue bg-opacity-5 border border-accent-blue border-opacity-20 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
        <p className="text-sm text-accent-blue text-opacity-90 leading-relaxed">
          Remember to set billing limits on your respective API provider accounts to avoid unexpected charges. 
          Local execution only prevents data exfiltration, not API usage costs.
        </p>
      </div>
    </div>
  );
}

function ApiKeyCard({ icon: Icon, iconColor, title, placeholder, initialValue, isConnected }: any) {
  const [value, setValue] = useState(initialValue);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-background-card border border-border rounded-lg p-5 flex flex-col gap-4 shadow-sm hover:border-text-muted transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-semibold text-text-primary">{title}</span>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-green bg-opacity-10 border border-accent-green border-opacity-20 rounded-full text-[10px] font-bold uppercase tracking-wider text-accent-green">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green"></div>
            Connected
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input 
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[#161B22] border border-border rounded-md py-2 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors placeholder:text-text-muted"
          />
          <button 
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button className="bg-accent-blue hover:bg-blue-600 text-white text-sm font-semibold py-2 px-5 rounded-md transition-colors shadow-sm">
          Save
        </button>
      </div>
    </div>
  );
}

function DatabaseSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Database Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">
          Connect your Serverless Agent Platform to your Supabase instance.
        </p>
      </div>

      <div className="space-y-4">
        <ApiKeyCard 
          icon={Database} 
          iconColor="text-accent-green"
          title="Supabase Project URL" 
          placeholder="https://your-project.supabase.co"
          initialValue="https://abcdefghijklmno.supabase.co"
          isConnected={true}
        />
        <ApiKeyCard 
          icon={Key} 
          iconColor="text-accent-green"
          title="Supabase Anon Key" 
          placeholder="Enter anon public key"
          initialValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          isConnected={true}
        />
      </div>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-secondary mt-1">
          Connect external services to give your agents more capabilities.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IntegrationCard name="GitHub" description="Read repos, create PRs, review code" connected={true} />
        <IntegrationCard name="Google Drive" description="Read and write documents and sheets" connected={false} />
        <IntegrationCard name="Notion" description="Manage pages and databases" connected={false} />
        <IntegrationCard name="Slack" description="Send notifications and read messages" connected={false} />
        <IntegrationCard name="Gmail" description="Read job alerts and send emails" connected={false} />
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
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Appearance</h1>
        <p className="text-sm text-text-secondary mt-1">
          Customize the look and feel of your dashboard.
        </p>
      </div>

      <div className="bg-background-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Theme Preference</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="border-2 border-accent-blue rounded-lg p-4 bg-[#0D1117] flex flex-col items-center gap-3 cursor-pointer">
            <div className="w-full h-16 rounded bg-[#161B22] border border-[#30363D] flex items-center justify-center">
               <div className="w-8 h-2 bg-[#30363D] rounded-full"></div>
            </div>
            <span className="text-sm font-semibold text-text-primary">Dark (Active)</span>
          </div>
          
          <div className="border-2 border-transparent rounded-lg p-4 bg-[#F6F8FA] flex flex-col items-center gap-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-full h-16 rounded bg-white border border-[#D0D7DE] flex items-center justify-center">
               <div className="w-8 h-2 bg-[#D0D7DE] rounded-full"></div>
            </div>
            <span className="text-sm font-semibold text-gray-900">Light</span>
          </div>

          <div className="border-2 border-transparent rounded-lg p-4 bg-gradient-to-br from-[#0D1117] to-[#F6F8FA] flex flex-col items-center gap-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-full h-16 rounded bg-background-secondary border border-border flex items-center justify-center">
               <div className="w-4 h-4 rounded-full bg-accent-blue"></div>
            </div>
            <span className="text-sm font-semibold text-text-primary">System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
