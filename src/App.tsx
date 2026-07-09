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

export default function App() {
  // Master Workspace States
  const [files, setFiles] = useState<CodeFile[]>(initialCodebase);
  const [activeFileId, setActiveFileId] = useState<string>('file-1');

  // Sidebar Panels layout
  // 'explorer' is always on the left.
  // 'rightPanel' holds one of: 'ai' | 'collab' | 'vc' | 'sync' | 'trace'
  const [rightPanel, setRightPanel] = useState<'ai' | 'collab' | 'vc' | 'sync' | 'trace'>('ai');

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
        }),
      });

      if (res.ok) {
        const data: AIDebugResult = await res.json();
        setDebugResult(data);
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
        const data: AIExplainResult = await res.json();
        setExplainResult(data);
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
        const data: AITutorResult = await res.json();
        setTutorResult(data);
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

    // Apply the correction (For high-fidelity, replace full code or apply template correction)
    // We replace the entire text block or simulate precise inline fixes:
    let newContent = fixCode;
    if (fixCode.trim().length < activeFile.content.trim().length / 3) {
      // It's a short snippet, let's insert or overwrite it based on context
      // Fallback: replace files completely or let them accept the full file
      // If the fix is full code block, apply it completely:
      newContent = fixCode;
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

  return (
    <div className="flex flex-col h-screen bg-[#0A0C10] text-slate-300 overflow-hidden font-sans" id="app-root">
      {/* Header: Symmetrical Layout */}
      <header className="h-14 border-b border-slate-800 bg-[#0F1117] flex items-center justify-between px-6 shrink-0 z-10">
        {/* Left column (1/3 width) */}
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-sm">Λ</div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wider">OMNIDEBUG AI</span>
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
          <button className="p-2 hover:bg-slate-800 rounded cursor-pointer text-slate-400 hover:text-indigo-400 transition" title="Security Details">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Action Rail (Far Left Narrow Utility Rail) */}
        <div className="w-16 bg-[#0F1117] border-r border-slate-800 flex flex-col items-center py-4 justify-between shrink-0">
          <div className="flex flex-col gap-4">
            {/* AI Workspace Trigger */}
            <button
              onClick={() => setRightPanel('ai')}
              className={`p-3 rounded transition-all ${
                rightPanel === 'ai'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="AI Debugger, Explainer & Tutor"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            {/* Prism Execution Trace Trigger */}
            <button
              onClick={() => setRightPanel('trace')}
              className={`p-3 rounded transition-all ${
                rightPanel === 'trace'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Prism Execution Trace Timeline"
            >
              <Cpu className="h-4 w-4 text-indigo-400" />
            </button>

            {/* Pair Programming Trigger */}
            <button
              onClick={() => setRightPanel('collab')}
              className={`p-3 rounded transition-all ${
                rightPanel === 'collab'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Pair Programming Room"
            >
              <Users className="h-4 w-4" />
            </button>

            {/* Version Control Trigger */}
            <button
              onClick={() => setRightPanel('vc')}
              className={`p-3 rounded transition-all ${
                rightPanel === 'vc'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Version Control Snapshots"
            >
              <GitBranch className="h-4 w-4" />
            </button>

            {/* IDE & Cloud Sync Trigger */}
            <button
              onClick={() => setRightPanel('sync')}
              className={`p-3 rounded transition-all ${
                rightPanel === 'sync'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="IDE Configurations & Latency Diagnostics"
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>

          <div className="text-[9px] text-slate-600 font-mono tracking-widest select-none">
            V2.4
          </div>
        </div>

        {/* Column 1: Files Tree Explorer */}
        <div className="w-80 h-full flex-shrink-0">
          <CodebaseExplorer
            files={files}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCodebaseUpdated={handleCodebaseUpdated}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
          />
        </div>

        {/* Column 2: Code Editor (The Canvas) */}
        <div className="flex-1 h-full flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
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
          />
        </div>

        {/* Column 3: Custom Right Sidebar Action Tab */}
        <div className="w-[420px] h-full flex-shrink-0 border-l border-slate-800">
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
              onSelectTraceStep={(step) => { setActiveTraceStep(step); setRightPanel('trace'); }}
              onClearGroundedResponse={() => setGroundedAIResponse(null)}
              isGroundedRunning={isExplainingGrounded}
            />
          )}

          {rightPanel === 'trace' && (
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
            />
          )}

          {rightPanel === 'vc' && (
            <VersionControlPanel
              commits={commits}
              activeCommitHash={activeCommitHash}
              onCheckout={handleCheckoutCommit}
              onToggleDiff={handleToggleDiff}
              diffCommit={diffCommit}
            />
          )}

          {rightPanel === 'sync' && (
            <IDESyncPanel />
          )}
        </div>
      </div>
    </div>
  );
}
