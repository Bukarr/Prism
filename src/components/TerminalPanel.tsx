import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  Info, 
  Command,
  Flame,
  GitBranch,
  Settings,
  Sparkles,
  HelpCircle,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { CodeFile, CollaborationRoom } from '../types';

interface TerminalPanelProps {
  files: CodeFile[];
  activeFile: CodeFile | null;
  room: CollaborationRoom | null;
  userId: string;
  username: string;
  onSendConsoleCommand?: (text: string, type: 'info' | 'error' | 'success' | 'input') => void;
  onClearConsole?: () => void;
  bugs?: any[];
  onApplyFix?: (bugId: string, fixCode: string) => void;
  onTriggerAIMentorChat?: (text: string) => void;
}

interface TerminalLine {
  id: string;
  text: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'system';
  timestamp: string;
  tabId: string;
}

interface TerminalTab {
  id: string;
  name: string;
  type: 'bash' | 'build' | 'ai';
  isActive: boolean;
}

export default function TerminalPanel({
  files,
  activeFile,
  room,
  userId,
  username,
  onSendConsoleCommand,
  onClearConsole,
  bugs = [],
  onApplyFix,
  onTriggerAIMentorChat,
}: TerminalPanelProps) {
  // Terminal Panel settings
  const [isOpen, setIsOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [terminalTheme, setTerminalTheme] = useState<'retro' | 'cyberpunk' | 'monokai' | 'slate'>('slate');
  
  // Tabs state
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'tab-bash', name: 'bash', type: 'bash', isActive: true },
    { id: 'tab-build', name: 'node build-watcher', type: 'build', isActive: false },
    { id: 'tab-ai', name: 'mentor-ai-sh', type: 'ai', isActive: false }
  ]);
  
  const activeTab = tabs.find(t => t.isActive) || tabs[0];

  // Command logs state
  const [localLogs, setLocalLogs] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      text: 'OmniDebug Dynamic Shell Interface (v2.4.1-stable)',
      type: 'info',
      timestamp: new Date().toLocaleTimeString(),
      tabId: 'tab-bash'
    },
    {
      id: 'init-2',
      text: 'Type "help" to list available system diagnostic tools and scripts.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
      tabId: 'tab-bash'
    },
    {
      id: 'init-3',
      text: '[Build Watcher] Ready. Awaiting trigger (npm run build)...',
      type: 'info',
      timestamp: new Date().toLocaleTimeString(),
      tabId: 'tab-build'
    },
    {
      id: 'init-4',
      text: '✨ AI Mentor shell active. Run "ai inspect" or "ai tutor" to analyze codebase.',
      type: 'success',
      timestamp: new Date().toLocaleTimeString(),
      tabId: 'tab-ai'
    }
  ]);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStep, setBuildStep] = useState('');

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with collaboration room logs
  useEffect(() => {
    if (room && room.consoleLogs) {
      // Map room logs to our lines
      const mapped: TerminalLine[] = room.consoleLogs.map((log) => ({
        id: log.id,
        text: `${log.author ? `[${log.author}] ` : ''}${log.text}`,
        type: log.type,
        timestamp: log.timestamp,
        tabId: 'tab-bash' // map room console logs into bash tab
      }));
      
      // Filter out mapped duplicates from local logs and merge
      setLocalLogs(prev => {
        const localOnly = prev.filter(p => !p.id.startsWith('log-') && !p.id.startsWith('sys-'));
        return [...localOnly, ...mapped];
      });
    }
  }, [room?.consoleLogs]);

  // Scroll to bottom on log additions
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localLogs, isBuilding, buildProgress, buildStep, activeTab]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleClearAll = () => {
    // Clear local logs for active tab
    setLocalLogs(prev => prev.filter(line => line.tabId !== activeTab.id));
    
    // If room is active and clear callback is provided, trigger it
    if (room && onClearConsole) {
      onClearConsole();
    }
  };

  const addLine = (text: string, type: TerminalLine['type'] = 'output', tabId: string = activeTab.id) => {
    const newLine: TerminalLine = {
      id: `line-${Date.now()}-${Math.random()}`,
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
      tabId
    };
    setLocalLogs(prev => [...prev, newLine]);
  };

  // Autocomplete support (Tab key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const parts = inputValue.trim().split(' ');
      const lastWord = parts[parts.length - 1];
      if (!lastWord) return;

      // Match files
      const matchFile = files.find(f => f.name.toLowerCase().startsWith(lastWord.toLowerCase()));
      if (matchFile) {
        parts[parts.length - 1] = matchFile.name;
        setInputValue(parts.join(' '));
        return;
      }

      // Match commands
      const commands = ['help', 'ls', 'cat', 'clear', 'npm run build', 'npm test', 'git status', 'git log', 'whoami', 'theme', 'ai inspect', 'fortune'];
      const matchCmd = commands.find(c => c.startsWith(inputValue));
      if (matchCmd) {
        setInputValue(matchCmd);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = inputValue.trim();
    if (!command) return;

    // Add command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Output command prompt
    addLine(command, 'input');
    setInputValue('');

    // If collab session is active and we are in bash tab, sync to server room
    if (room && onSendConsoleCommand && activeTab.id === 'tab-bash') {
      onSendConsoleCommand(command, 'input');
    }

    // Process command locally
    executeLocalCommand(command);
  };

  const executeLocalCommand = (rawCommand: string) => {
    const cmdLower = rawCommand.toLowerCase().trim();
    const args = rawCommand.split(' ');
    const cmd = args[0].toLowerCase();
    const arg1 = args[1];

    if (cmd === 'clear') {
      setLocalLogs(prev => prev.filter(line => line.tabId !== activeTab.id));
      return;
    }

    if (cmd === 'help') {
      addLine('Interactive CLI Command Center - Available Utilities:', 'info');
      addLine('  help                           Display this instruction registry.', 'output');
      addLine('  ls                             List all virtual codebase files & specs.', 'output');
      addLine('  cat <file_name>                Render source contents for a loaded file.', 'output');
      addLine('  npm run build                  Execute full bundle and production build sequence.', 'output');
      addLine('  npm test                       Initiate Unit & Integration test runner.', 'output');
      addLine('  git status                     Inspect file mutations and active branch indicators.', 'output');
      addLine('  git log                        Display checkout snapshots and author histories.', 'output');
      addLine('  whoami                         Reveal security scope & current user alias.', 'output');
      addLine('  theme <retro | slate | monokai | cyberpunk>', 'output');
      addLine('                                 Dynamically shift terminal visual styling presets.', 'output');
      addLine('  ai inspect                     Trigger AI core code audit diagnostics on current file.', 'output');
      addLine('  fortune                        Read a clever quote or developer proverb.', 'output');
      return;
    }

    if (cmd === 'ls') {
      addLine(`Listing ${files.length} active workspace codebase files:`, 'info');
      files.forEach(f => {
        const sizeKb = (f.content.length / 1024).toFixed(2);
        addLine(`  -rw-r--r--   staff   ${sizeKb} kB   ${f.name}   [${f.language}]`, 'output');
      });
      return;
    }

    if (cmd === 'cat') {
      if (!arg1) {
        addLine('Error: Please specify file name. Syntax: cat <file_name>', 'error');
        return;
      }
      const fileToView = files.find(f => f.name.toLowerCase() === arg1.toLowerCase());
      if (!fileToView) {
        addLine(`Error: File "${arg1}" not found in current folder workspace.`, 'error');
        return;
      }
      addLine(`--- Contents: ${fileToView.name} (${fileToView.path}) ---`, 'info');
      const lines = fileToView.content.split('\n');
      lines.forEach((line, index) => {
        addLine(`${String(index + 1).padStart(3, ' ')} | ${line}`, 'output');
      });
      return;
    }

    if (cmd === 'whoami') {
      addLine(`User Alias: ${username || 'Anonymous developer'}`, 'success');
      addLine(`Client Session ID: ${userId}`, 'output');
      addLine(`Current Working Directory: /src`, 'output');
      addLine(`Room Connection: ${room ? `ROOM #${room.id} [Synced]` : 'Single-Dev Sandbox'}`, 'output');
      return;
    }

    if (cmd === 'theme') {
      if (!arg1 || !['retro', 'cyberpunk', 'monokai', 'slate'].includes(arg1.toLowerCase())) {
        addLine('Available Themes: theme retro | theme slate | theme monokai | theme cyberpunk', 'info');
        return;
      }
      setTerminalTheme(arg1.toLowerCase() as any);
      addLine(`Terminal theme successfully changed to: [${arg1.toUpperCase()}]`, 'success');
      return;
    }

    if (cmd === 'fortune') {
      const proverbs = [
        "\"There are two ways of constructing a software design: One way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies.\" — C.A.R. Hoare",
        "\"If debugging is the process of removing software bugs, then programming must be the process of putting them in.\" — Edsger W. Dijkstra",
        "\"Deleted code is debugged code.\" — Jeff Sickel",
        "\"The best error message is the one that never shows up because the system works flawlessly.\" — AI Mentor",
        "\"Talk is cheap. Show me the code.\" — Linus Torvalds",
        "\"Simplicity is the soul of efficiency.\" — Austin Freeman"
      ];
      const random = proverbs[Math.floor(Math.random() * proverbs.length)];
      addLine(random, 'success');
      return;
    }

    if (cmd === 'npm' && args[1] === 'run' && args[2] === 'build' || (cmdLower === 'npm run build' || cmdLower === 'npm build')) {
      triggerBuildSimulation();
      return;
    }

    if (cmdLower === 'npm test' || cmdLower === 'npm run test') {
      triggerTestSimulation();
      return;
    }

    if (cmdLower === 'git status') {
      addLine('On branch master', 'info');
      addLine('Your branch is up to date with \'origin/master\'.', 'output');
      addLine('', 'output');
      addLine('Changes not staged for commit:', 'output');
      addLine('  (use "git add <file>..." to update what will be committed)', 'output');
      addLine('  (use "git restore <file>..." to discard changes in working directory)', 'output');
      addLine(`\tmodified:   src/${activeFile ? activeFile.name : 'App.tsx'}`, 'error');
      addLine('', 'output');
      addLine('no changes added to commit (use "git add" and/or "git commit -a")', 'output');
      return;
    }

    if (cmdLower === 'git log') {
      addLine('commit a9df82c9e771e8bf (HEAD -> master, origin/master)', 'info');
      addLine('Author: AI Mentor <mentor@omnidebug.ai>', 'output');
      addLine('Date:   Thu Jul 9 00:46:12 2026 -0700', 'output');
      addLine('    feat: integrate secure collaboration socket channels and real-time cursor syncs', 'success');
      addLine('', 'output');
      addLine('commit 4bc81f33a921708d', 'info');
      addLine(`Author: ${username || 'Developer'} <${username ? username.toLowerCase() : 'dev'}@workspace.io>`, 'output');
      addLine('Date:   Wed Jul 8 21:12:05 2026 -0700', 'output');
      addLine('    init: bootstrap TypeScript application structure and diagnostic rulesets', 'success');
      return;
    }

    if (cmd === 'ai' && arg1 === 'inspect') {
      if (activeFile) {
        addLine(`🤖 Triggering AI Core inspect diagnostic over: [${activeFile.name}]`, 'info');
        if (onTriggerAIMentorChat) {
          addLine('Communicating with neural diagnostic layers...', 'info');
          onTriggerAIMentorChat(`Please review ${activeFile.name} and provide a comprehensive terminal summary of bugs, performance, or optimizations.`);
        } else {
          addLine('Executing localized scan...', 'info');
          setTimeout(() => {
            addLine('✅ Analysis completed. 0 fatal syntax compilation failures found.', 'success');
            addLine('💡 Suggestion: check async try-catch blocks to prevent uncaught promise rejections.', 'info');
          }, 8000);
        }
      } else {
        addLine('Error: No active file focused. Open a file in the workspace first.', 'error');
      }
      return;
    }

    // Default simulation response
    addLine(`Command not found: "${cmd}". Type "help" to show available system diagnostic commands.`, 'error');
  };

  const triggerBuildSimulation = () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setBuildProgress(0);
    setBuildStep('Initializing esbuild compiler bundler...');
    
    let progress = 0;
    const steps = [
      { p: 10, s: 'Checking TypeScript compiler options (tsconfig.json)...' },
      { p: 25, s: 'Parsing file trees, asset maps, and system entry points...' },
      { p: 40, s: 'Stripping type headers and compiling ES Modules...' },
      { p: 60, s: 'Bundling external dependencies and resolving code paths...' },
      { p: 75, s: 'Minifying assets & injecting source maps...' },
      { p: 90, s: 'Generating chunk: dist/assets/index-Dsz932A.js (242.4 kB)...' },
      { p: 95, s: 'Generating chunk: dist/assets/index-Bv39Xm1.css (32.8 kB)...' },
      { p: 100, s: 'Build Completed successfully! Output written inside dist/.' }
    ];

    const interval = setInterval(() => {
      progress += 5;
      if (progress <= 100) {
        setBuildProgress(progress);
        const matchedStep = steps.find(st => progress <= st.p);
        if (matchedStep) {
          setBuildStep(matchedStep.s);
        }
      } else {
        clearInterval(interval);
        setIsBuilding(false);
        addLine('⚡ npm run build output:', 'info');
        addLine('  vite v6.2.3 building for production...', 'output');
        addLine('  ✓ 492 modules transformed.', 'success');
        addLine('  rendering chunks...', 'output');
        addLine('  dist/index.html                     1.24 kB │ gzip:  0.48 kB', 'output');
        addLine('  dist/assets/index-Dsz932A.js      242.41 kB │ gzip: 82.52 kB', 'output');
        addLine('  dist/assets/index-Bv39Xm1.css      32.80 kB │ gzip:  8.92 kB', 'output');
        addLine('  ✓ built in 1.48s', 'success');
        addLine('🎉 Production compilation completed with 0 errors.', 'success');
      }
    }, 150);
  };

  const triggerTestSimulation = () => {
    addLine('🧪 Initiating OmniDebug Test Suite Runner (Jest-watcher CLI)...', 'info');
    addLine('> jest --watchAll=false src/', 'output');
    
    // Simulate thinking delay
    setTimeout(() => {
      if (bugs && bugs.length > 0) {
        // We have active bugs! Let's output a failing test report showing off amazing diagnostic integration!
        addLine('FAIL  src/App.test.tsx (3.82s)', 'error');
        addLine(`  ✖ Component builds successfully but encountered active AI Debugger issues:`, 'error');
        bugs.forEach(bug => {
          addLine(`    - [LINE ${bug.line}] ${bug.title}`, 'error');
          addLine(`      Severity: ${bug.severity.toUpperCase()} | Desc: ${bug.description}`, 'error');
        });
        addLine('', 'output');
        addLine('Test Suites: 1 failed, 1 total', 'error');
        addLine(`Tests:       ${bugs.length} failed, 2 passed, ${bugs.length + 2} total`, 'error');
        addLine('Snapshots:   0 total', 'output');
        addLine('Time:        4.12s, estimated 5s', 'output');
        addLine('Ran all test suites. Please fix the highlighted debugger issues and re-run!', 'error');
      } else {
        // Fully green passing test report!
        addLine('PASS  src/App.test.tsx (2.12s)', 'success');
        addLine('  ✓ Main IDE application components loaded perfectly (450ms)', 'success');
        addLine('  ✓ Collaboration Tunnel handshake checks validated (120ms)', 'success');
        addLine('  ✓ Local state consistency managers verified (68ms)', 'success');
        addLine('', 'output');
        addLine('Test Suites: 1 passed, 1 total', 'success');
        addLine('Tests:       3 passed, 3 total', 'success');
        addLine('Snapshots:   0 total', 'output');
        addLine('Time:        2.35s', 'output');
        addLine('🎉 All tests passed successfully! Code is perfectly safe to deploy.', 'success');
      }
    }, 1200);
  };

  const handleAddNewTab = () => {
    const nextTabNum = tabs.length + 1;
    const newTab: TerminalTab = {
      id: `tab-custom-${Date.now()}`,
      name: `custom-sh-${nextTabNum}`,
      type: 'bash',
      isActive: false
    };
    
    setTabs(prev => {
      const reset = prev.map(t => ({ ...t, isActive: false }));
      return [...reset, { ...newTab, isActive: true }];
    });

    setLocalLogs(prev => [
      ...prev,
      {
        id: `custom-init-${Date.now()}`,
        text: `Custom Terminal Session custom-sh-${nextTabNum} initialized.`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString(),
        tabId: newTab.id
      }
    ]);
  };

  const handleSelectTab = (id: string) => {
    setTabs(prev => prev.map(t => ({
      ...t,
      isActive: t.id === id
    })));
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least 1 tab
    
    const indexToClose = tabs.findIndex(t => t.id === id);
    const wasActive = tabs[indexToClose].isActive;
    
    const newTabs = tabs.filter(t => t.id !== id);
    if (wasActive) {
      // Find another tab to make active
      const nextActiveIndex = Math.max(0, indexToClose - 1);
      newTabs[nextActiveIndex].isActive = true;
    }
    
    setTabs(newTabs);
    // Filter out logs for closed tab to free memory
    setLocalLogs(prev => prev.filter(l => l.tabId !== id));
  };

  // Get filtered logs for active tab
  const activeLogs = localLogs.filter(log => log.tabId === activeTab.id);

  // Return style attributes based on chosen theme
  const getThemeStyles = () => {
    switch (terminalTheme) {
      case 'cyberpunk':
        return {
          bg: 'bg-[#12041D]',
          text: 'text-[#00FF66]',
          border: 'border-[#FF007F]/40',
          inputBg: 'bg-[#1B052A]',
          caretColor: '#00FFFF',
          promptColor: 'text-[#FF007F]',
          commandColor: 'text-[#00FFFF]'
        };
      case 'monokai':
        return {
          bg: 'bg-[#272822]',
          text: 'text-[#F8F8F2]',
          border: 'border-[#75715E]/40',
          inputBg: 'bg-[#1E1F1C]',
          caretColor: '#F8F8F0',
          promptColor: 'text-[#F92672]',
          commandColor: 'text-[#A6E22E]'
        };
      case 'slate':
        return {
          bg: 'bg-[#161a22]',
          text: 'text-slate-200',
          border: 'border-[#222733]',
          inputBg: 'bg-[#11141a]',
          caretColor: '#6366F1',
          promptColor: 'text-indigo-400',
          commandColor: 'text-[#E2E8F0]'
        };
      case 'retro':
      default: // Matrix classic green
        return {
          bg: 'bg-[#020503]',
          text: 'text-[#10B981]',
          border: 'border-emerald-900/50',
          inputBg: 'bg-[#060B07]',
          caretColor: '#10B981',
          promptColor: 'text-[#34D399]',
          commandColor: 'text-[#6EE7B7]'
        };
    }
  };

  const themeStyles = getThemeStyles();

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-11 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 hover:text-indigo-300 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-mono font-bold shadow-2xl transition-all hover:scale-105 z-40 cursor-pointer"
        id="terminal-expand-trigger"
      >
        <TerminalIcon className="h-4 w-4 animate-pulse text-indigo-400" />
        <span>Terminal Emulator</span>
        {bugs && bugs.length > 0 && (
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={`w-full transition-all border-t flex flex-col ${themeStyles.bg} ${themeStyles.border} ${
        isMaximized ? 'h-[75vh]' : 'h-64'
      }`}
      id="terminal-container"
      onClick={focusInput}
    >
      {/* Terminal Title Bar */}
      <div className="h-10 bg-[#11141a] border-b border-[#222733] flex items-center justify-between px-4 select-none shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-slate-450" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
            Terminal CLI Emulator
          </span>
          {room && (
            <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-sans font-bold uppercase tracking-wider animate-pulse">
              COL-SYNC LIVE
            </span>
          )}
        </div>

        {/* Tab strip in titlebar */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-lg px-2">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTab(tab.id);
              }}
              className={`px-3 py-1 text-[10px] font-mono rounded flex items-center gap-2 border transition cursor-pointer select-none shrink-0 ${
                tab.isActive
                  ? 'bg-[#161a22] border-[#222733] text-indigo-400 font-bold'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350 hover:bg-[#161a22]/35'
              }`}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="p-0.5 rounded text-slate-600 hover:text-red-400 transition hover:bg-[#1f242f]"
                  title="Close session"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddNewTab();
            }}
            className="p-1 rounded bg-[#11141a] hover:bg-[#1f242f] border border-[#222733] text-slate-500 hover:text-slate-300 transition cursor-pointer"
            title="Open new terminal tab"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick theme selector pill */}
          <div className="flex bg-slate-900/80 border border-slate-850 p-0.5 rounded">
            {(['retro', 'cyberpunk', 'slate'] as const).map(th => (
              <button
                key={th}
                onClick={(e) => {
                  e.stopPropagation();
                  setTerminalTheme(th);
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-mono font-bold transition ${
                  terminalTheme === th
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {th}
              </button>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
            title="Clear Console Buffer"
            id="terminal-clear-btn"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(!isMaximized);
            }}
            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-slate-300 transition cursor-pointer"
            title={isMaximized ? "Minimize Viewport" : "Maximize Viewport"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
            title="Collapse Terminal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Output Viewport */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 leading-relaxed selection:bg-indigo-500/20">
        {/* Render lines */}
        {activeLogs.map((line) => (
          <div key={line.id} className="flex items-start gap-2 animate-fade-in">
            {line.type === 'input' && (
              <span className={`select-none shrink-0 ${themeStyles.promptColor}`}>$</span>
            )}
            <div className={`whitespace-pre-wrap flex-1 ${
              line.type === 'error'
                ? 'text-red-400'
                : line.type === 'success'
                ? 'text-emerald-400'
                : line.type === 'info'
                ? 'text-blue-400'
                : line.type === 'system'
                ? 'text-purple-400 font-semibold'
                : line.type === 'input'
                ? themeStyles.commandColor + ' font-bold'
                : themeStyles.text
            }`}>
              {line.text}
            </div>
          </div>
        ))}

        {/* Dynamic Build Simulation Progress Bar Rendering */}
        {isBuilding && (
          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg max-w-lg space-y-2 select-none animate-pulse">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 animate-bounce text-amber-500" />
                <span>BUILDING PRODUCTION BUNDLE</span>
              </span>
              <span className="text-slate-400 font-bold">{buildProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-150" 
                style={{ width: `${buildProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 italic truncate">
              Status: {buildStep}
            </p>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <form 
        onSubmit={handleCommandSubmit}
        className={`h-9 border-t flex items-center px-4 gap-2 shrink-0 ${themeStyles.inputBg} ${themeStyles.border}`}
      >
        <span className={`font-mono text-xs select-none ${themeStyles.promptColor}`}>
          {username ? `${username.toLowerCase()}@omnidebug` : 'dev@omnidebug'}:/src$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 bg-transparent border-none outline-none font-mono text-xs ${themeStyles.text}`}
          placeholder='Type a command... (e.g. "help", "npm run build", "npm test", "ls", "git status")'
          spellCheck="false"
          autoFocus
          style={{ caretColor: themeStyles.caretColor }}
        />
        <div className="flex items-center gap-1.5 text-[9px] text-slate-550 select-none">
          <span className="px-1.5 py-0.5 bg-slate-950/80 border border-slate-900/60 rounded font-bold font-sans">TAB</span>
          <span>autocomplete</span>
          <span className="mx-1 text-slate-700">|</span>
          <span className="px-1.5 py-0.5 bg-slate-950/80 border border-slate-900/60 rounded font-bold font-sans">↑↓</span>
          <span>history</span>
        </div>
      </form>
    </div>
  );
}
