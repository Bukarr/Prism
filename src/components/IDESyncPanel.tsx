import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Key, RefreshCw, Zap, ExternalLink, Sliders } from 'lucide-react';

export default function IDESyncPanel() {
  const [activeIDE, setActiveIDE] = useState<'vscode' | 'codespaces' | 'gitpod' | 'replit'>('vscode');
  const [latencyHistory, setLatencyHistory] = useState<number[]>([42, 45, 48, 41, 44, 46, 42, 43, 45, 41]);
  const [clientPrivateKey, setClientPrivateKey] = useState('ecdh_priv_7f3a8b2c9d1e4f6a8b5c4d3e2f1a0b9c');
  const [clientPublicKey, setClientPublicKey] = useState('ecdh_pub_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d');
  const [isRotating, setIsRotating] = useState(false);

  // Latency graph update loop
  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyHistory((prev) => {
        const nextVal = Math.floor(40 + Math.random() * 8);
        return [...prev.slice(1), nextVal];
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleRotateKey = () => {
    setIsRotating(true);
    setTimeout(() => {
      const hexChars = '0123456789abcdef';
      let newPriv = 'ecdh_priv_';
      let newPub = 'ecdh_pub_';
      for (let i = 0; i < 32; i++) {
        newPriv += hexChars[Math.floor(Math.random() * 16)];
        newPub += hexChars[Math.floor(Math.random() * 16)];
      }
      setClientPrivateKey(newPriv);
      setClientPublicKey(newPub);
      setIsRotating(false);
    }, 800);
  };

  // Content for cloud IDEs
  const ideInstructions = {
    vscode: {
      title: "Visual Studio Code Extension",
      badge: "Marketplace: v1.4.2",
      install: "ext install omnidebug-ai",
      config: `{
  "omnidebug.server": "https://omnidebug.example.com",
  "omnidebug.e2eeEnabled": true,
  "omnidebug.autoSync": true
}`,
    },
    codespaces: {
      title: "GitHub Codespaces Workspace",
      badge: "Docker Image: v1.2.0",
      install: "echo 'omnidebug-cli sync --daemon' >> .devcontainer/onCreate.sh",
      config: `{
  "customizations": {
    "vscode": {
      "extensions": ["omnidebug-ai.omnidebug-vscode-extension"]
    }
  }
}`,
    },
    gitpod: {
      title: "Gitpod Workspace Integration",
      badge: "Tasks: Auto-Boot",
      install: "curl -fsSL https://omnidebug.ai/install.sh | sh",
      config: `tasks:
  - init: npm install
    command: omnidebug-cli watch .`,
    },
    replit: {
      title: "Replit Agent Daemon Integration",
      badge: "Plugin: Active",
      install: "replit-agent install omnidebug-link",
      config: `[deployment]
run = "omnidebug-cli link --port 3000"`,
    },
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-slate-355 border-l border-slate-800 font-sans" id="ide-sync-panel">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-indigo-400" />
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cloud IDE & Security</h2>
        </div>
        <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 font-mono flex items-center gap-1 font-semibold uppercase tracking-wider">
          <Zap className="h-3 w-3 text-indigo-400" />
          <span>Active Tunnel</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* SECTION 1: SYNCHRONIZATION LATENCY */}
        <div className="bg-slate-950/40 border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Synchronization Latency</h3>
            <span className="text-xs font-mono font-bold text-indigo-400">
              AVG: {Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)} MS
            </span>
          </div>

          {/* Simple Visual Line Chart built with SVG */}
          <div className="h-16 w-full flex items-end">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="5" x2="100" y2="5" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="1,1" />
              <line x1="0" y1="10" x2="100" y2="10" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="1,1" />
              <line x1="0" y1="15" x2="100" y2="15" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="1,1" />

              {/* Area */}
              <path
                d={`M 0 20 ${latencyHistory.map((val, idx) => `L ${(idx * 100) / (latencyHistory.length - 1)} ${25 - (val - 30)}`).join(' ')} L 100 20 Z`}
                fill="url(#latencyGrad)"
              />
              {/* Line */}
              <path
                d={latencyHistory.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx * 100) / (latencyHistory.length - 1)} ${25 - (val - 30)}`).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {latencyHistory.map((val, idx) => (
                <circle
                  key={idx}
                  cx={(idx * 100) / (latencyHistory.length - 1)}
                  cy={25 - (val - 30)}
                  r="0.8"
                  fill="#6366f1"
                />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>25s ago</span>
            <span>Real-time Ping Metrics</span>
            <span>Now</span>
          </div>
        </div>

        {/* SECTION 2: END TO END ENCRYPTION */}
        <div className="bg-slate-950/40 border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span>E2EE Cryptographics</span>
            </h3>
            <button
              onClick={handleRotateKey}
              disabled={isRotating}
              className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded transition cursor-pointer"
              title="Rotate Cryptographic Keys"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 text-[10px] font-mono">
            <div className="space-y-1 p-2 bg-[#0A0C10] border border-slate-800/80 rounded">
              <div className="text-slate-500 font-bold uppercase flex items-center gap-1">
                <Key className="h-3 w-3 text-indigo-400" /> Client Public (ECDH):
              </div>
              <div className="text-slate-300 break-all select-all font-mono leading-normal">{clientPublicKey}</div>
            </div>

            <div className="space-y-1 p-2 bg-[#0A0C10] border border-slate-800/80 rounded">
              <div className="text-slate-500 font-bold uppercase flex items-center gap-1">
                <Key className="h-3 w-3 text-rose-500" /> Client Private (Local):
              </div>
              <div className="text-slate-300 break-all select-all font-mono leading-normal">{clientPrivateKey}</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 leading-normal">
            Secure code snapshots are cryptographically sealed locally before synchronization across our distributed cloud nodes.
          </div>
        </div>

        {/* SECTION 3: CLOUD IDE INTEGRATIONS */}
        <div className="space-y-3 bg-[#0F1117]">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cloud IDE Configuration</h3>

          {/* Tab Selector */}
          <div className="grid grid-cols-4 bg-slate-950 border border-slate-800 p-0.5 rounded text-[10px]">
            <button
              onClick={() => setActiveIDE('vscode')}
              className={`py-1 rounded font-semibold uppercase tracking-wider transition ${
                activeIDE === 'vscode' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              VS Code
            </button>
            <button
              onClick={() => setActiveIDE('codespaces')}
              className={`py-1 rounded font-semibold uppercase tracking-wider transition ${
                activeIDE === 'codespaces' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Spaces
            </button>
            <button
              onClick={() => setActiveIDE('gitpod')}
              className={`py-1 rounded font-semibold uppercase tracking-wider transition ${
                activeIDE === 'gitpod' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Gitpod
            </button>
            <button
              onClick={() => setActiveIDE('replit')}
              className={`py-1 rounded font-semibold uppercase tracking-wider transition ${
                activeIDE === 'replit' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Replit
            </button>
          </div>

          {/* Selected IDE content */}
          <div className="bg-slate-950/40 border border-slate-800 rounded p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200">{ideInstructions[activeIDE].title}</h4>
              <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                {ideInstructions[activeIDE].badge}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Terminal Setup Command:</div>
              <div className="flex items-center gap-2 p-2 bg-[#0A0C10] border border-slate-850 rounded font-mono text-[10px] text-indigo-400 break-all select-all">
                <span>$</span>
                <span>{ideInstructions[activeIDE].install}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Config Block (`.omnidebug`):</div>
              <pre className="p-2.5 bg-[#0A0C10] border border-slate-850 rounded font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre leading-relaxed select-all">
                {ideInstructions[activeIDE].config}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
