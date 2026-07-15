import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot, Home, Activity, CheckSquare, Settings } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-accent-blue bg-opacity-10 text-accent-blue' 
          : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary'
      }`
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
);

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border bg-background-primary flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-accent-blue" />
            <span className="font-bold text-lg tracking-tight">Serverless Agent Platform</span>
          </div>
          
          <nav className="flex items-center gap-2">
            <NavItem to="/" icon={Home} label="Dashboard" />
            <NavItem to="/runs" icon={Activity} label="Runs" />
            <NavItem to="/agents" icon={Bot} label="Agents" />
            <NavItem to="/submit" icon={CheckSquare} label="Submit Task" />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-green bg-opacity-10 border border-accent-green border-opacity-20">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse-fast"></div>
            <span className="text-xs font-semibold text-accent-green tracking-wide uppercase">Live</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background-primary p-6">
        <div className="max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
