import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Users,
  GitBranch,
  Terminal,
  Cpu,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ShieldAlert,
  Activity,
  Keyboard,
} from 'lucide-react';
import { CodeFile, BugReport, AIDebugResult, AIExplainResult, AITutorResult, CollaborationRoom, VCCommit, ExecutionTrace } from './types';
import { initialCodebase } from './data/mockCodebase';
import CodebaseExplorer from './components/CodebaseExplorer';
import EditorPanel from './components/EditorPanel';
import AIDebuggerTabs from './components/AIDebuggerTabs';
import CollaborationPanel from './components/CollaborationPanel';
import VersionControlPanel from './components/VersionControlPanel';
import IDESyncPanel from './components/IDESyncPanel';
import TerminalPanel from './components/TerminalPanel';
import TraceInspectorPanel from './components/TraceInspectorPanel';
import { generateExecutionTrace } from './lib/traceEngine';

export default function App() {
  // Master Workspace States
  const [files, setFiles] = useState<CodeFile[]>(initialCodebase);
  const [activeFileId, setActiveFileId] = useState<string>('file-1');

  // Sidebar Panels layout
  // 'explorer' is always on the left.
  // 'rightPanel' holds one of: 'ai' | 'collab' | 'vc' | 'sync'
  const [rightPanel, setRightPanel] = useState<'ai' | 'collab' | 'vc' | 'sync'>('ai');

  // Collapsible panels states
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isTraceDrawerExpanded, setIsTraceDrawerExpanded] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Trace Engine States
  const [currentTrace, setCurrentTrace] = useState<ExecutionTrace | null>(null);
  const [comparisonTrace, setComparisonTrace] = useState<ExecutionTrace | null>(null);
  const [activeTraceStep, setActiveTraceStep] = useState<number>(1);
  const [groundedAIResponse, setGroundedAIResponse] = useState<{ question: string; response: string; step: number; isDivergence?: boolean } | null>(null);
  const [isExplainingGrounded, setIsExplainingGrounded] = useState(false);

  // AI Active States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isTutoring, setIsTutoring] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState<'debug' | 'explain' | 'tutor'>('debug');

  // AI Results
  const [debugResult, setDebugResult] = useState<AIDebugResult | null>(null);
  const [explainResult, setExplainResult] = useState<AIExplainResult | null>(null);
  const [tutorResult, setTutorResult] = useState<AITutorResult | null>(null);

  // AI Connection / Status
  const [aiQuotaExceeded, setAiQuotaExceeded] = useState(false);
  const [aiFallbackActive, setAiFallbackActive] = useState(false);

  // Failed Test Logs Context
  const [failedTestLogs, setFailedTestLogs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prism_failed_test_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tutor validation state
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false);
  const [tutorVerificationFeedback, setTutorVerificationFeedback] = useState<string | null>(null);

  // Collaboration Room States
  const [room, setRoom] = useState<CollaborationRoom | null>(null);
  const [username, setUsername] = useState('Dev_' + Math.floor(100 + Math.random() * 900));
  const [userId] = useState('user-' + Math.random().toString(36).substring(2, 9));

  // Version Control Snapshots
  const [commits, setCommits] = useState<VCCommit[]>([]);
  const [activeCommitHash, setActiveCommitHash] = useState<string | null>(null);
  const [diffCommit, setDiffCommit] = useState<VCCommit | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  // Initialize first commit checkpoint
  useEffect(() => {
    const fileSnapshots: Record<string, string> = {};
    files.forEach((f) => {
      fileSnapshots[f.id] = f.content;
    });

    const firstCommit: VCCommit = {
      id: 'commit-1',
      hash: 'cf7e8a9',
      timestamp: new Date().toLocaleTimeString(),
      description: 'Initial codebase workspace ingested',
      author: 'Workspace Engine',
      files: fileSnapshots,
    };

    setCommits([firstCommit]);
    setActiveCommitHash('cf7e8a9');

    // Check AI status
    const checkAiStatus = async () => {
      try {
        const res = await fetch('/api/gemini/status');
        if (res.ok) {
          const data = await res.json();
          setAiQuotaExceeded(data.globalQuotaExceeded);
        }
      } catch (err) {
        console.error('Failed to check AI status:', err);
      }
    };
    checkAiStatus();
  }, []);

  // Sync / Polling interval for Collaboration Rooms
  useEffect(() => {
    if (!room) return;

    const interval = setInterval(async () => {
      try {
        // Sync active file content to the room if collaborating
        if (activeFile) {
          await fetch(`/api/rooms/${room.id}/file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: activeFile.id, content: activeFile.content }),
          });
        }

        // Sync cursor and active file tracking
        await fetch(`/api/rooms/${room.id}/cursor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, cursor: { line: 1, ch: 1 }, activeFileId }),
        });

        // Pull fresh room state
        const response = await fetch(`/api/rooms/${room.id}`);
        if (response.ok) {
          const freshRoom: CollaborationRoom = await response.json();
          setRoom(freshRoom);

          // If another member updated active files, reflect those in local files map
          const updatedFiles = files.map((f) => {
            if (freshRoom.files[f.id] !== undefined && freshRoom.files[f.id] !== f.content) {
              return { ...f, content: freshRoom.files[f.id] };
            }
            return f;
          });
          setFiles(updatedFiles);
        }
      } catch (err) {
        console.error('Failed to poll room sync status:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [room, files, activeFileId, userId]);

  // Handle active file selection
  const handleSelectFile = (id: string) => {
    setActiveFileId(id);
    // Clear out stale AI results to keep UI fresh & context aligned
    setDebugResult(null);
    setExplainResult(null);
    setTutorResult(null);
    setTutorVerificationFeedback(null);
    setDiffCommit(null);
  };

  // Handle codebase uploaded
  const handleCodebaseUpdated = (newFiles: CodeFile[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      setActiveFileId(newFiles[0].id);
    }
    createCommitSnapshot('Codebase workspace imported / folder upload');
  };

  // Add new file manually
  const handleAddFile = (name: string, content: string = '') => {
    const newFile: CodeFile = {
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      name,
      path: name,
      content,
      language: name.split('.').pop() || 'javascript',
    };
    const updated = [...files, newFile];
    setFiles(updated);
    setActiveFileId(newFile.id);
    createCommitSnapshot(`Created file ${name}`);
  };

  // Delete file manually
  const handleDeleteFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    if (activeFileId === id && updated.length > 0) {
      setActiveFileId(updated[0].id);
    }
    createCommitSnapshot('Deleted file from workspace');
  };

  // Edit file content directly in editor
  const handleContentChange = (newContent: string) => {
    const updated = files.map((f) => {
      if (f.id === activeFileId) {
        return { ...f, content: newContent };
      }
      return f;
    });
    setFiles(updated);
  };

  // Create VC commit snapshots on change triggers
  const createCommitSnapshot = (description: string, customAuthor?: string) => {
    const fileSnapshots: Record<string, string> = {};
    files.forEach((f) => {
      fileSnapshots[f.id] = f.content;
    });

    const hash = Math.random().toString(16).substring(2, 9);
    const newCommit: VCCommit = {
      id: 'commit-' + Date.now(),
      hash,
      timestamp: new Date().toLocaleTimeString(),
      description,
      author: customAuthor || username || 'Developer',
      files: fileSnapshots,
    };

    setCommits((prev) => [newCommit, ...prev]);
    setActiveCommitHash(hash);
  };

  // Rollback / checkout snapshot
  const handleCheckoutCommit = (hash: string) => {
    const commit = commits.find((c) => c.hash === hash);
    if (!commit) return;

    const restoredFiles = files.map((f) => {
      if (commit.files[f.id] !== undefined) {
        return { ...f, content: commit.files[f.id] };
      }
      return f;
    });

    setFiles(restoredFiles);
    setActiveCommitHash(hash);
    setDiffCommit(null);
  };

  // Toggle diff modes
  const handleToggleDiff = (commit: VCCommit | null) => {
    setDiffCommit(commit);
  };

  const handleResetAiStatus = async () => {
    try {
      const res = await fetch('/api/gemini/status/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiQuotaExceeded(data.globalQuotaExceeded);
        setAiFallbackActive(false);
        handleSendConsoleCommand('AI connection state reset successfully. Retrying live Gemini API calls.', 'success');
      }
    } catch (err) {
      console.error('Failed to reset AI status:', err);
    }
  };

  const handleRecordFailedTestLog = (log: string) => {
    setFailedTestLogs(prev => {
      if (prev[0] === log) return prev;
      const updated = [log, ...prev].slice(0, 3);
      try {
        localStorage.setItem('prism_failed_test_logs', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save failed test logs:', e);
      }
      return updated;
    });
  };

  const handleClearFailedTestLogs = () => {
    setFailedTestLogs([]);
    try {
      localStorage.removeItem('prism_failed_test_logs');
    } catch (e) {
      console.error('Failed to clear failed test logs:', e);
    }
  };

  // API Call: Trigger Gemini code debugging analysis
  const handleAnalyzeDebug = async () => {
    if (!activeFile) return;
    setIsAnalyzing(true);
    setAiActiveTab('debug');

    try {
      const res = await fetch('/api/gemini/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          filename: activeFile.name,
          fileId: activeFile.id,
          failedTestLogs: failedTestLogs,
        }),
      });

      if (res.ok) {
        const data: AIDebugResult & { isFallback?: boolean; fallbackReason?: string } = await res.json();
        setDebugResult(data);
        if (data.isFallback) {
          setAiFallbackActive(true);
          if (data.fallbackReason === 'quota_exceeded') {
            setAiQuotaExceeded(true);
          }
        } else {
          setAiFallbackActive(false);
          setAiQuotaExceeded(false);
        }
      }
    } catch (err) {
      console.error('Debugger API failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // API Call: Explain logic flows
  const handleExplainLogic = async () => {
    if (!activeFile) return;
    setIsExplaining(true);
    setAiActiveTab('explain');

    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          filename: activeFile.name,
          fileId: activeFile.id,
        }),
      });

      if (res.ok) {
        const data: AIExplainResult & { isFallback?: boolean; fallbackReason?: string } = await res.json();
        setExplainResult(data);
        if (data.isFallback) {
          setAiFallbackActive(true);
          if (data.fallbackReason === 'quota_exceeded') {
            setAiQuotaExceeded(true);
          }
        } else {
          setAiFallbackActive(false);
          setAiQuotaExceeded(false);
        }
      }
    } catch (err) {
      console.error('Logic Explainer API failed:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  // API Call: Trigger step-by-step Tutor Mentorship Session
  const handleStartTutor = async () => {
    if (!activeFile) return;
    setIsTutoring(true);
    setAiActiveTab('tutor');
    setTutorVerificationFeedback(null);

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          filename: activeFile.name,
          fileId: activeFile.id,
        }),
      });

      if (res.ok) {
        const data: AITutorResult & { isFallback?: boolean; fallbackReason?: string } = await res.json();
        setTutorResult(data);
        if (data.isFallback) {
          setAiFallbackActive(true);
          if (data.fallbackReason === 'quota_exceeded') {
            setAiQuotaExceeded(true);
          }
        } else {
          setAiFallbackActive(false);
          setAiQuotaExceeded(false);
        }
      }
    } catch (err) {
      console.error('AI Tutor session init failed:', err);
    } finally {
      setIsTutoring(false);
    }
  };

  // API Call: Verify step-by-step Tutor Answers
  const handleVerifyTutorAnswer = async (answer: string) => {
    if (!activeFile || !tutorResult) return;
    const currentStep = tutorResult.steps[tutorResult.currentStepIndex];

    setIsVerifyingAnswer(true);
    try {
      const res = await fetch('/api/gemini/tutor-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          question: currentStep.question,
          userAnswer: answer,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTutorVerificationFeedback(data.feedback);

        if (data.passed) {
          // Increment step index
          const updatedSteps = tutorResult.steps.map((step, idx) => {
            if (idx === tutorResult.currentStepIndex) {
              return { ...step, completed: true, userAnswer: answer, feedback: data.feedback };
            }
            return step;
          });

          setTutorResult({
            ...tutorResult,
            steps: updatedSteps,
            currentStepIndex: tutorResult.currentStepIndex + 1,
          });
        }
      }
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setIsVerifyingAnswer(false);
    }
  };

  // Action: Apply AI Code Fix directly
  const handleApplyFix = (bugId: string, fixCode: string) => {
    if (!activeFile) return;

    const fileLines = activeFile.content.split('\n');
    const bug = debugResult?.bugs?.find((b) => b.id === bugId);
    
    let newContent = fixCode;
    
    // Check if the fixCode is a full file or a snippet
    const isFullFile = fixCode.includes('import ') && fixCode.includes('export ') || 
                       (fixCode.split('\n').length > fileLines.length * 0.7 && fileLines.length > 10);
                       
    if (bug && !isFullFile) {
      const lineIdx = bug.line - 1;
      if (lineIdx >= 0 && lineIdx < fileLines.length) {
        const currentLineText = fileLines[lineIdx];
        
        // Multi-line block detection (e.g., loops like forEach that span multiple lines)
        let linesToRemove = 1;
        if (currentLineText.includes('forEach') && lineIdx + 4 < fileLines.length && fileLines[lineIdx + 4].includes('});')) {
          linesToRemove = 5;
        } else if (currentLineText.includes('forEach') && lineIdx + 3 < fileLines.length && fileLines[lineIdx + 3].includes('});')) {
          linesToRemove = 4;
        } else if (currentLineText.includes('forEach') && lineIdx + 2 < fileLines.length && fileLines[lineIdx + 2].includes('});')) {
          linesToRemove = 3;
        }
        
        // Preserving original indentation
        const indentMatch = currentLineText.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        
        // Split fixCode lines and indent them
        const fixLines = fixCode.split('\n').map((line, idx) => {
          if (idx === 0) return indent + line.trimStart();
          return indent + line;
        });
        
        // Replace the specific line(s) in fileLines
        fileLines.splice(lineIdx, linesToRemove, ...fixLines);
        newContent = fileLines.join('\n');
      }
    }

    const updated = files.map((f) => {
      if (f.id === activeFileId) {
        return { ...f, content: newContent };
      }
      return f;
    });

    setFiles(updated);
    // Clear the resolved bug from list
    if (debugResult) {
      const remainingBugs = debugResult.bugs.filter((b) => b.id !== bugId);
      setDebugResult({
        ...debugResult,
        bugs: remainingBugs,
        summary: remainingBugs.length > 0 ? 'Remaining codebase issues:' : 'No remaining bugs detected!',
      });
    }

    createCommitSnapshot(`Applied AI fix for bug: ${bugId}`, 'AI Debugger');
  };

  // Collaboration Room Actions
  const handleStartRoom = async () => {
    try {
      const filePayload: Record<string, string> = {};
      files.forEach((f) => {
        filePayload[f.id] = f.content;
      });

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${username}'s Session`,
          activeFileId,
          files: filePayload,
        }),
      });

      if (res.ok) {
        const freshRoom = await res.json();
        setRoom(freshRoom);

        // Join the room as a member
        await handleJoinRoom(freshRoom.id);
      }
    } catch (err) {
      console.error('Start room failed:', err);
    }
  };

  const handleJoinRoom = async (id: string) => {
    try {
      const res = await fetch(`/api/rooms/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName: username }),
      });

      if (res.ok) {
        const joinedRoom = await res.json();
        setRoom(joinedRoom);
        setRightPanel('collab');
      }
    } catch (err) {
      console.error('Join room failed:', err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName: username, text }),
      });

      if (res.ok) {
        const updatedRoom = await res.json();
        setRoom(updatedRoom);
      }
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const handleTriggerAIMentorChat = async (text: string) => {
    if (!room || !activeFile) return;
    try {
      const res = await fetch(`/api/rooms/${room.id}/ai-mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          activeCode: activeFile.content,
          filename: activeFile.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update room with AI mentor's response
        const roomRes = await fetch(`/api/rooms/${room.id}`);
        if (roomRes.ok) {
          const freshRoom = await roomRes.json();
          setRoom(freshRoom);
        }
      }
    } catch (err) {
      console.error('AI mentor prompt failed:', err);
    }
  };

  const handleToggleScreenShare = async (isSharing: boolean) => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.id}/screenshare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName: username, isSharing }),
      });

      if (res.ok) {
        const updatedRoom = await res.json();
        setRoom(updatedRoom);
      }
    } catch (err) {
      console.error('Toggle screenshare failed:', err);
    }
  };

  const handleSendConsoleCommand = async (text: string, type: 'info' | 'error' | 'success' | 'input' = 'input') => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.id}/console`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName: username, text, type }),
      });

      if (res.ok) {
        const updatedRoom = await res.json();
        setRoom(updatedRoom);
      }
    } catch (err) {
      console.error('Send console command failed:', err);
    }
  };

  const handleClearConsoleLogs = async () => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.id}/console`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const updatedRoom = await res.json();
        setRoom(updatedRoom);
      }
    } catch (err) {
      console.error('Clear console logs failed:', err);
    }
  };

  const handleTriggerGroundedAIExplanation = async (
    question: string,
    trace: ExecutionTrace,
    step: number,
    diff: any
  ) => {
    setIsExplainingGrounded(true);
    setRightPanel('ai');
    setAiActiveTab('explain');
    
    try {
      const response = await fetch('/api/gemini/grounded-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile?.content,
          filename: activeFile?.name,
          question,
          trace,
          activeStep: step,
          diff
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroundedAIResponse({
          question,
          response: data.explanation,
          step,
          isDivergence: !!diff
        });
      } else {
        console.error('Failed to generate grounded explain response.');
      }
    } catch (err) {
      console.error('Error generating trace explanation:', err);
    } finally {
      setIsExplainingGrounded(false);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close shortcuts modal
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
      }

      // Ctrl + Enter: Run trace probe on the active file
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (activeFile) {
          setIsTraceDrawerExpanded(true);
          const traceA = generateExecutionTrace(activeFile);
          setCurrentTrace(traceA);
          setActiveTraceStep(1);
          handleSendConsoleCommand(`prism run ${activeFile.name}`, 'input');
          setTimeout(() => {
            handleSendConsoleCommand(`Successfully initiated trace analysis for ${activeFile.name}. Built with ${traceA.events.length} steps.`, 'success');
          }, 300);
        }
      }

      // Ctrl + Shift + T: Toggle trace drawer expansion
      if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        if (!currentTrace && activeFile) {
          const traceA = generateExecutionTrace(activeFile);
          setCurrentTrace(traceA);
          setActiveTraceStep(1);
        }
        setIsTraceDrawerExpanded((prev) => !prev);
      }

      // Ctrl + Shift + A: Toggle AI panel
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (rightPanel === 'ai' && isRightPanelOpen) {
          setIsRightPanelOpen(false);
        } else {
          setRightPanel('ai');
          setIsRightPanelOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFile, currentTrace, rightPanel, isRightPanelOpen]);

  return (
    <div className="flex flex-col h-screen bg-[#0A0C10] text-slate-300 overflow-hidden font-sans" id="app-root">
      {/* Header: Symmetrical Layout */}
      <header className="h-14 border-b border-slate-800 bg-[#0F1117] flex items-center justify-between px-6 shrink-0 z-10">
        {/* Left column (1/3 width) */}
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-sm">P</div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wider">PRISM AI</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Unified Debugging Interface</span>
          </div>
        </div>
        
        {/* Center column (1/3 width) */}
        <div className="flex items-center justify-center gap-3 w-1/3 bg-slate-900/40 py-1.5 px-4 rounded-full border border-slate-800">
          <div className="flex -space-x-1.5">
            <div className="w-5 h-5 rounded-full border border-slate-900 bg-emerald-500" title="Active Core"></div>
            <div className="w-5 h-5 rounded-full border border-slate-900 bg-amber-500" title="AI Assistant Linked"></div>
            <div className="w-5 h-5 rounded-full border border-slate-900 bg-indigo-500 flex items-center justify-center text-[8px] text-white font-bold">
              {room ? room.members.length + 1 : '1'}
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-400 truncate">
            {room ? `Live Session: Room #${room.id.substring(0, 5)}` : 'Live Session: Single-Dev Workspace'}
          </span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
        </div>

        {/* Right column (1/3 width) */}
        <div className="flex items-center justify-end gap-6 w-1/3">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-slate-900/80 border border-slate-800 rounded text-[9px] text-slate-400 font-mono tracking-widest uppercase">
              {room ? 'COLLAB SYNCED' : 'LOCAL CLOUD SYNCED'}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 hover:bg-slate-800 rounded cursor-pointer text-slate-400 hover:text-indigo-400 transition flex items-center gap-1"
            title="Keyboard Shortcuts Menu"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded cursor-pointer text-slate-400 hover:text-indigo-400 transition" title="Security Details">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden bg-[#11141a] relative">
        {/* Workspace Action Rail (Far Left Narrow Utility Rail) */}
        <div className="w-16 bg-[#161a22] border-r border-[#222733] flex flex-col items-center py-4 justify-between shrink-0 select-none z-40">
          <div className="flex flex-col gap-4">
            {/* File Explorer Toggle */}
            <button
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className={`p-3 rounded-lg transition-all ${
                isLeftPanelOpen
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
              }`}
              title={isLeftPanelOpen ? "Collapse File Explorer" : "Expand File Explorer"}
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            <div className="h-[1px] w-8 bg-[#222733] my-1 self-center"></div>

            {/* AI Workspace Trigger */}
            <button
              onClick={() => {
                if (rightPanel === 'ai' && isRightPanelOpen) {
                  setIsRightPanelOpen(false);
                } else {
                  setRightPanel('ai');
                  setIsRightPanelOpen(true);
                }
              }}
              className={`p-3 rounded-lg transition-all ${
                rightPanel === 'ai' && isRightPanelOpen
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
              }`}
              title="AI Debugger, Explainer & Tutor"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            {/* Prism Execution Trace Trigger */}
            <button
              onClick={() => {
                if (!currentTrace) {
                  // Instrument code automatically if no trace is active
                  if (activeFile) {
                    setIsTraceDrawerExpanded(true);
                    const traceA = generateExecutionTrace(activeFile);
                    setCurrentTrace(traceA);
                    setActiveTraceStep(1);
                  }
                } else {
                  setIsTraceDrawerExpanded(!isTraceDrawerExpanded);
                }
              }}
              className={`p-3 rounded-lg transition-all ${
                currentTrace
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
              }`}
              title="Toggle Execution Trace Scrubber Drawer"
            >
              <Cpu className="h-4 w-4" />
            </button>

            {/* Pair Programming Trigger */}
            <button
              onClick={() => {
                if (rightPanel === 'collab' && isRightPanelOpen) {
                  setIsRightPanelOpen(false);
                } else {
                  setRightPanel('collab');
                  setIsRightPanelOpen(true);
                }
              }}
              className={`p-3 rounded-lg transition-all ${
                rightPanel === 'collab' && isRightPanelOpen
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
              }`}
              title="Pair Programming Room"
            >
              <Users className="h-4 w-4" />
            </button>

            {/* Version Control Trigger */}
            <button
              onClick={() => {
                if (rightPanel === 'vc' && isRightPanelOpen) {
                  setIsRightPanelOpen(false);
                } else {
                  setRightPanel('vc');
                  setIsRightPanelOpen(true);
                }
              }}
              className={`p-3 rounded-lg transition-all ${
                rightPanel === 'vc' && isRightPanelOpen
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
              }`}
              title="Version Control Snapshots"
            >
              <GitBranch className="h-4 w-4" />
            </button>

            {/* IDE & Cloud Sync Trigger */}
            <button
              onClick={() => {
                if (rightPanel === 'sync' && isRightPanelOpen) {
                  setIsRightPanelOpen(false);
                } else {
                  setRightPanel('sync');
                  setIsRightPanelOpen(true);
                }
              }}
              className={`p-3 rounded-lg transition-all ${
                rightPanel === 'sync' && isRightPanelOpen
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
              }`}
              title="IDE Configurations & Latency Diagnostics"
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>

          <div className="text-[10px] text-slate-600 font-mono tracking-wider select-none font-extrabold">
            PRISM
          </div>
        </div>

        {/* Drawer 1: Files Tree Explorer (Absolute Drawer Overlay) */}
        <div 
          className={`absolute top-0 bottom-0 left-16 w-80 bg-[#161a22] border-r border-[#222733] z-30 transition-all duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.55)] flex flex-col ${
            isLeftPanelOpen 
              ? 'translate-x-0 opacity-100 pointer-events-auto' 
              : '-translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <CodebaseExplorer
            files={files}
            activeFileId={activeFileId}
            onSelectFile={(id) => {
              handleSelectFile(id);
              // Close left drawer overlay automatically when selecting a file on small screens
              if (window.innerWidth < 1024) {
                setIsLeftPanelOpen(false);
              }
            }}
            onCodebaseUpdated={handleCodebaseUpdated}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onClose={() => setIsLeftPanelOpen(false)}
          />
        </div>

        {/* Core Canvas: Code Editor & Auxiliary Panels */}
        <div className="flex-1 h-full flex flex-col min-h-0 bg-[#12151c]">
          <div className="flex-1 min-h-0 flex flex-col relative">
            <EditorPanel
              file={activeFile}
              onContentChange={handleContentChange}
              onAnalyzeDebug={handleAnalyzeDebug}
              onExplainLogic={handleExplainLogic}
              onStartTutor={handleStartTutor}
              isAnalyzing={isAnalyzing}
              isExplaining={isExplaining}
              isTutoring={isTutoring}
              bugs={debugResult ? debugResult.bugs : []}
              roomMembers={room ? room.members : []}
              userId={userId}
              diffAgainstContent={diffCommit ? diffCommit.files[activeFileId] : null}
              activeTraceLine={currentTrace?.events[activeTraceStep - 1]?.line || null}
              activeTraceStep={currentTrace ? activeTraceStep : null}
              activeTraceEvent={currentTrace?.events[activeTraceStep - 1] || null}
            />
          </div>

          {/* PRISM TRACE DRAWER (Bottom drawer: collapsed to a slim scrubber strip by default, expanding upward only when user is debugging) */}
          {currentTrace && (
            <div className={`border-t border-[#222733] transition-all duration-300 bg-[#161a22] flex flex-col shrink-0 ${isTraceDrawerExpanded ? 'h-[380px]' : 'h-[52px]'}`}>
              <TraceInspectorPanel
                activeFile={activeFile}
                currentTrace={currentTrace}
                onTraceUpdated={(trace) => {
                  setCurrentTrace(trace);
                  setActiveTraceStep(1);
                }}
                comparisonTrace={comparisonTrace}
                onComparisonTraceUpdated={setComparisonTrace}
                activeStepIndex={activeTraceStep}
                onSelectStepIndex={setActiveTraceStep}
                onTriggerGroundedAIExplanation={(question, trace, step, diff) => 
                  handleTriggerGroundedAIExplanation(question, trace, step, diff)
                }
                isAIAnswering={isExplainingGrounded}
                isExpanded={isTraceDrawerExpanded}
                onToggleExpanded={() => setIsTraceDrawerExpanded(!isTraceDrawerExpanded)}
              />
            </div>
          )}

          <TerminalPanel
            files={files}
            activeFile={activeFile}
            room={room}
            userId={userId}
            username={username}
            onSendConsoleCommand={handleSendConsoleCommand}
            onClearConsole={handleClearConsoleLogs}
            bugs={debugResult ? debugResult.bugs : []}
            onApplyFix={handleApplyFix}
            onTriggerAIMentorChat={handleTriggerAIMentorChat}
            onRecordFailedTestLog={handleRecordFailedTestLog}
          />
        </div>

        {/* Drawer 2: Custom Right Sidebar Action Tab (Absolute Drawer Overlay) */}
        <div 
          className={`absolute top-0 bottom-0 right-0 w-[420px] bg-[#161a22] border-l border-[#222733] z-30 transition-all duration-300 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden ${
            isRightPanelOpen 
              ? 'translate-x-0 opacity-100 pointer-events-auto' 
              : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          {rightPanel === 'ai' && (
            <AIDebuggerTabs
              activeFile={activeFile}
              debugResult={debugResult}
              explainResult={explainResult}
              tutorResult={tutorResult}
              activeTab={aiActiveTab}
              setActiveTab={setAiActiveTab}
              onApplyFix={handleApplyFix}
              onVerifyTutorAnswer={handleVerifyTutorAnswer}
              isVerifyingAnswer={isVerifyingAnswer}
              tutorVerificationFeedback={tutorVerificationFeedback}
              onStartTutor={handleStartTutor}
              groundedAIResponse={groundedAIResponse}
              onSelectTraceStep={(step) => { 
                setActiveTraceStep(step); 
                setIsTraceDrawerExpanded(true); 
              }}
              onClearGroundedResponse={() => setGroundedAIResponse(null)}
              isGroundedRunning={isExplainingGrounded}
              aiQuotaExceeded={aiQuotaExceeded}
              aiFallbackActive={aiFallbackActive}
              onResetAiStatus={handleResetAiStatus}
              failedTestLogs={failedTestLogs}
              onClearFailedTestLogs={handleClearFailedTestLogs}
              onClose={() => setIsRightPanelOpen(false)}
            />
          )}

          {rightPanel === 'collab' && (
            <CollaborationPanel
              room={room}
              username={username}
              setUsername={setUsername}
              onStartRoom={handleStartRoom}
              onJoinRoom={handleJoinRoom}
              onSendMessage={handleSendMessage}
              onTriggerAIMentorChat={handleTriggerAIMentorChat}
              userId={userId}
              onToggleScreenShare={handleToggleScreenShare}
              onSendConsoleCommand={handleSendConsoleCommand}
              onClose={() => setIsRightPanelOpen(false)}
            />
          )}

          {rightPanel === 'vc' && (
            <VersionControlPanel
              commits={commits}
              activeCommitHash={activeCommitHash}
              onCheckout={handleCheckoutCommit}
              onToggleDiff={handleToggleDiff}
              diffCommit={diffCommit}
              onClose={() => setIsRightPanelOpen(false)}
            />
          )}

          {rightPanel === 'sync' && (
            <IDESyncPanel onClose={() => setIsRightPanelOpen(false)} />
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#11141a] border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-fade-in text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Prism Key Bindings</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-500 hover:text-white text-xs font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Boost your productivity with the following unified core navigation shortcuts designed for power users.
              </p>

              <div className="space-y-3.5">
                {/* Shortcut 1 */}
                <div className="flex items-start justify-between gap-4 p-2.5 bg-slate-900/50 border border-slate-850 rounded-lg">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200">Run Probe / Active Trace</div>
                    <div className="text-[10px] text-slate-500">Executes tracer engine simulator on current file</div>
                  </div>
                  <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono font-extrabold text-indigo-400 shrink-0">Ctrl + Enter</kbd>
                </div>

                {/* Shortcut 2 */}
                <div className="flex items-start justify-between gap-4 p-2.5 bg-slate-900/50 border border-slate-850 rounded-lg">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200">Toggle Trace Drawer</div>
                    <div className="text-[10px] text-slate-500">Expands/minimizes bottom scrubber drawer</div>
                  </div>
                  <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono font-extrabold text-indigo-400 shrink-0">Ctrl + Shift + T</kbd>
                </div>

                {/* Shortcut 3 */}
                <div className="flex items-start justify-between gap-4 p-2.5 bg-slate-900/50 border border-slate-850 rounded-lg">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200">Toggle AI Assistant Panel</div>
                    <div className="text-[10px] text-slate-500">Shows/hides the AI tab on the right side</div>
                  </div>
                  <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono font-extrabold text-indigo-400 shrink-0">Ctrl + Shift + A</kbd>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 text-center font-mono">
              Press <kbd className="px-1 bg-slate-900 border border-slate-850 rounded text-slate-400">Esc</kbd> anytime to exit this menu.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
