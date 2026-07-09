import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  GitMerge, 
  Terminal, 
  AlertCircle,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle,
  FileText
} from 'lucide-react';
import { CodeFile, ExecutionTrace, TraceEvent } from '../types';
import { generateExecutionTrace, diffExecutionTraces, TraceDiffResult } from '../lib/traceEngine';

interface TraceInspectorPanelProps {
  activeFile: CodeFile | null;
  currentTrace: ExecutionTrace | null;
  onTraceUpdated: (trace: ExecutionTrace | null) => void;
  comparisonTrace: ExecutionTrace | null;
  onComparisonTraceUpdated: (trace: ExecutionTrace | null) => void;
  activeStepIndex: number;
  onSelectStepIndex: (index: number) => void;
  onTriggerGroundedAIExplanation: (question: string, trace: ExecutionTrace, step: number, diff?: TraceDiffResult | null) => void;
  isAIAnswering: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export default function TraceInspectorPanel({
  activeFile,
  currentTrace,
  onTraceUpdated,
  comparisonTrace,
  onComparisonTraceUpdated,
  activeStepIndex,
  onSelectStepIndex,
  onTriggerGroundedAIExplanation,
  isAIAnswering,
  isExpanded = false,
  onToggleExpanded
}: TraceInspectorPanelProps) {
  const [payloadA, setPayloadA] = useState('{"name": "Alice", "age": null}');
  const [payloadB, setPayloadB] = useState('{"name": "Bob", "age": 25}');
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isTraceRunning, setIsTraceRunning] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // States for loop diagnostics & warning confirmation
  const [pendingTraceA, setPendingTraceA] = useState<ExecutionTrace | null>(null);
  const [pendingTraceB, setPendingTraceB] = useState<ExecutionTrace | null>(null);
  const [showLoopWarning, setShowLoopWarning] = useState(false);
  const [warningDetails, setWarningDetails] = useState<{
    type: 'loop_threshold_exceeded';
    message: string;
    threshold: number;
    actualCount: number;
  } | null>(null);

  // Synchronize payload defaults if the user opens Python or JS
  useEffect(() => {
    if (activeFile) {
      if (activeFile.name === 'process_pipeline.py') {
        setPayloadA('{"configs": {"timeout": null, "data": null}}');
        setPayloadB('{"configs": {"timeout": 15, "data": [1, 2, 3, 4]}}');
      } else if (activeFile.name === 'dataFetcher.ts') {
        setPayloadA('[]');
        setPayloadB('[]');
      } else {
        setPayloadA('{"name": "Alice", "age": null}');
        setPayloadB('{"name": "Bob", "age": 25}');
      }
    }
  }, [activeFile?.name]);

  // Handle auto-replay
  useEffect(() => {
    let interval: any;
    if (isPlaying && currentTrace && currentTrace.events.length > 0) {
      interval = setInterval(() => {
        if (activeStepIndex >= currentTrace.events.length) {
          setIsPlaying(false);
        } else {
          onSelectStepIndex(activeStepIndex + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrace, activeStepIndex, onSelectStepIndex]);

  const handleConfirmTruncate = () => {
    if (pendingTraceA) {
      const truncatedA: ExecutionTrace = {
        ...pendingTraceA,
        events: pendingTraceA.events.slice(0, 100),
        stdout: [...pendingTraceA.stdout, "[TRACER INFO] Execution trace truncated to 100 steps to prevent memory saturation."]
      };
      onTraceUpdated(truncatedA);
    }
    if (pendingTraceB) {
      const truncatedB: ExecutionTrace = {
        ...pendingTraceB,
        events: pendingTraceB.events.slice(0, 100),
        stdout: [...pendingTraceB.stdout, "[TRACER INFO] Execution trace truncated to 100 steps to prevent memory saturation."]
      };
      onComparisonTraceUpdated(truncatedB);
    } else {
      onComparisonTraceUpdated(null);
    }
    
    onSelectStepIndex(1);
    setShowLoopWarning(false);
    setPendingTraceA(null);
    setPendingTraceB(null);
  };

  const handleConfirmContinue = () => {
    if (pendingTraceA) {
      onTraceUpdated(pendingTraceA);
    }
    if (pendingTraceB) {
      onComparisonTraceUpdated(pendingTraceB);
    } else {
      onComparisonTraceUpdated(null);
    }
    
    onSelectStepIndex(1);
    setShowLoopWarning(false);
    setPendingTraceA(null);
    setPendingTraceB(null);
  };

  if (!activeFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-slate-500 font-sans border-l border-slate-900">
        <Cpu className="h-10 w-10 text-slate-800 mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-400">Execution Tracer</h3>
        <p className="text-xs text-center text-slate-600 mt-1 max-w-xs leading-normal">
          Select a Javascript, TypeScript, or Python file from the explorer to begin high-fidelity trace debugging.
        </p>
      </div>
    );
  }

  const runTracer = () => {
    setIsTraceRunning(true);
    setIsPlaying(false);
    
    setTimeout(() => {
      // Generate standard trace A
      const traceA = generateExecutionTrace(activeFile, payloadA);
      const traceB = isComparisonMode ? generateExecutionTrace(activeFile, payloadB) : null;
      
      const warning = traceA.warning || traceB?.warning;
      if (warning) {
        setPendingTraceA(traceA);
        setPendingTraceB(traceB);
        setWarningDetails(warning);
        setShowLoopWarning(true);
        setIsTraceRunning(false);
      } else {
        onTraceUpdated(traceA);
        onSelectStepIndex(1);
        if (isComparisonMode) {
          onComparisonTraceUpdated(traceB);
        } else {
          onComparisonTraceUpdated(null);
        }
        setIsTraceRunning(false);
      }
    }, 800);
  };

  const activeEvent: TraceEvent | undefined = currentTrace?.events[activeStepIndex - 1];
  const totalSteps = currentTrace?.events.length || 0;

  // Diff comparison if both traces are present
  const traceDiff: TraceDiffResult | null = (currentTrace && comparisonTrace) 
    ? diffExecutionTraces(currentTrace, comparisonTrace)
    : null;

  const handleAskCausalQuestion = (qType: 'why-null' | 'where-diverged' | 'general') => {
    if (!currentTrace) return;
    
    let queryText = '';
    if (qType === 'why-null') {
      queryText = `At step ${activeStepIndex}, line ${activeEvent?.line}, why is user.age or user null? Walk me through the actual recorded trace path.`;
    } else if (qType === 'where-diverged') {
      if (traceDiff) {
        queryText = `Compare the passing and failing runs. At step ${traceDiff.divergenceStepIndex}, we hit line ${traceDiff.divergenceLine}. Explain why the behavior diverged here based on actual variables and branch decisions.`;
      } else {
        queryText = `Compare passing versus failing runs for this file. Explain what happens under different payloads.`;
      }
    } else {
      queryText = customQuestion || `Explain what is happening at step ${activeStepIndex} of the execution.`;
    }

    onTriggerGroundedAIExplanation(queryText, currentTrace, activeStepIndex, traceDiff);
    setCustomQuestion('');
  };

  // RENDER SLIM SCRUBBER STRIP IF COLLAPSED
  if (!isExpanded) {
    return (
      <div className="h-full w-full bg-[#161a22] flex items-center justify-between px-4 font-sans select-none text-slate-300" id="trace-scrubber-strip">
        {/* Left: Expand/Collapse toggle + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleExpanded}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-md text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            title="Expand Trace Inspector Dashboard"
          >
            <span>▲</span>
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-[#222733]"></div>
          <div className="flex items-center gap-1.5 font-bold text-[10px] text-emerald-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Trace</span>
          </div>
        </div>

        {/* Center: Scrubber controls and slider */}
        {currentTrace ? (
          <div className="flex-1 max-w-4xl mx-6 flex items-center gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onSelectStepIndex(1)}
                disabled={activeStepIndex === 1}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="First Step"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onSelectStepIndex(Math.max(1, activeStepIndex - 1))}
                disabled={activeStepIndex === 1}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${
                  isPlaying ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                }`}
              >
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button
                onClick={() => onSelectStepIndex(Math.min(totalSteps, activeStepIndex + 1))}
                disabled={activeStepIndex === totalSteps}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onSelectStepIndex(totalSteps)}
                disabled={activeStepIndex === totalSteps}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Last Step"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Step Counter */}
            <span className="text-[11px] font-mono font-bold text-indigo-400 shrink-0 select-none">
              STEP {activeStepIndex} / {totalSteps}
            </span>

            {/* Slider */}
            <input 
              type="range"
              min="1"
              max={totalSteps}
              value={activeStepIndex}
              onChange={(e) => onSelectStepIndex(parseInt(e.target.value))}
              className="flex-1 accent-indigo-500 h-1 bg-slate-900 rounded-lg cursor-pointer min-w-[120px]"
            />

            {/* Step Event Mini-Annotation */}
            {activeEvent && (() => {
              let colorClass = 'text-indigo-400 bg-indigo-500/5 border border-indigo-500/10';
              let eventSymbol = '●';
              let eventText = `Step #${activeStepIndex}`;
              
              if (activeEvent.type === 'call' || activeEvent.type === 'return') {
                colorClass = 'text-prism-call bg-prism-call/10 border border-prism-call/20';
                eventSymbol = '●';
                eventText = activeEvent.type === 'call' 
                  ? `call ${activeEvent.functionName}(${activeEvent.variableName || ''})` 
                  : `return ${JSON.stringify(activeEvent.value)}`;
              } else if (activeEvent.type === 'assign') {
                colorClass = 'text-prism-state bg-prism-state/10 border border-prism-state/20';
                eventSymbol = '➔';
                eventText = `assign ${activeEvent.variableName} = ${typeof activeEvent.value === 'object' ? JSON.stringify(activeEvent.value) : String(activeEvent.value)}`;
              } else if (activeEvent.type === 'branch') {
                colorClass = 'text-prism-branch bg-prism-branch/10 border border-prism-branch/20';
                eventSymbol = '❖';
                eventText = `branch: ${activeEvent.outcome || 'taken'}`;
              } else if (activeEvent.type === 'info') {
                colorClass = 'text-prism-diverge bg-prism-diverge/10 border border-prism-diverge/20';
                eventSymbol = '✖';
                eventText = activeEvent.outcome || 'diverged';
              }
              
              return (
                <div className={`hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono max-w-[280px] truncate shadow-sm font-bold ${colorClass}`}>
                  <span>{eventSymbol}</span>
                  <span className="truncate">{eventText}</span>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 text-center text-xs text-slate-500 italic">No execution trace active</div>
        )}

        {/* Right: Quick payload display & config trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:block text-[10px] text-slate-500 font-mono">
            Payload: <span className="text-slate-300 font-bold">{payloadA}</span>
          </div>
          <button
            onClick={runTracer}
            disabled={isTraceRunning}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded transition cursor-pointer"
          >
            {isTraceRunning ? 'Tracing...' : 'Run Probe'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#161a22] select-none text-slate-300 font-sans" id="trace-panel">
      {/* Panel Header */}
      <div className="h-12 border-b border-[#222733] flex items-center justify-between px-4 bg-[#11141a]">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">
            Prism Trace Engine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono font-bold tracking-wider">
            V8 Dynamic Probe
          </span>
          <button
            onClick={onToggleExpanded}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 hover:bg-slate-800 border border-[#222733] rounded-md text-[10px] font-extrabold text-slate-400 hover:text-white transition cursor-pointer"
            title="Minimize Trace Panel"
          >
            <span>▼</span>
            <span>Scrubber</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tracer Setup Controls */}
        <div className="p-3.5 bg-slate-950 border border-slate-900/60 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-slate-400" />
              Runtime Config
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isComparisonMode}
                onChange={(e) => {
                  setIsComparisonMode(e.target.checked);
                  if (!e.target.checked) onComparisonTraceUpdated(null);
                }}
                className="rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
              />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Diff Runs</span>
            </label>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">
                {isComparisonMode ? 'Run A Payload (Failing Case)' : 'Mock Input Payload (JSON)'}
              </span>
              <input
                type="text"
                value={payloadA}
                onChange={(e) => setPayloadA(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
                placeholder='e.g. {"name": "Alice", "age": null}'
              />
            </div>

            {isComparisonMode && (
              <div className="animate-fade-in">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">
                  Run B Payload (Passing Case)
                </span>
                <input
                  type="text"
                  value={payloadB}
                  onChange={(e) => setPayloadB(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder='e.g. {"name": "Bob", "age": 25}'
                />
              </div>
            )}
          </div>

          <button
            onClick={runTracer}
            disabled={isTraceRunning}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-550 hover:to-pink-550 text-white font-bold text-xs uppercase tracking-wider rounded border border-indigo-500/20 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all duration-300 cursor-pointer disabled:opacity-50"
            id="btn-debug-with-trace"
          >
            {isTraceRunning ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Instrumenting Runtime...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                <span>Debug with Trace</span>
              </span>
            )}
          </button>

          <div className="text-[9px] text-slate-500 flex items-center gap-1 font-mono leading-normal">
            <Info className="h-3 w-3 text-slate-600 flex-shrink-0" />
            <span>Trace depth is capped at 100 steps to protect host system resources.</span>
          </div>
        </div>

        {/* Trace Comparison & Divergence Alert */}
        {isComparisonMode && currentTrace && comparisonTrace && (
          <div className="p-3.5 bg-gradient-to-br from-purple-950/20 to-indigo-950/10 border border-purple-900/35 rounded-lg space-y-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-purple-400" />
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Causal Divergence Report</h4>
            </div>

            {traceDiff ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 leading-normal">
                  Prism lined up both runs. Behaviors diverged at <strong className="text-purple-400">Step {traceDiff.divergenceStepIndex}</strong>, on <strong className="text-purple-400">Line {traceDiff.divergenceLine}</strong>:
                </p>
                <div className="bg-slate-950/80 p-2 border border-slate-900 rounded font-mono text-[10px] space-y-1.5">
                  <div className="text-slate-500 truncate">Code: {traceDiff.divergenceCodeLine}</div>
                  <div className="text-rose-400 font-semibold leading-normal">{traceDiff.divergenceReason}</div>
                </div>
                <button
                  onClick={() => onSelectStepIndex(traceDiff.divergenceStepIndex)}
                  className="w-full py-1 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800/40 hover:border-purple-800 text-purple-300 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded transition cursor-pointer"
                >
                  Snap Scrubber to Divergence
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>Both runs followed identical execution sequences! No divergence.</span>
              </p>
            )}
          </div>
        )}

        {/* Timeline Scrubber */}
        {currentTrace && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Execution Timeline</span>
              <span className="text-[10px] font-mono text-slate-500">
                Step {activeStepIndex} of {totalSteps}
              </span>
            </div>

            {/* Scrubber slider bar */}
            <div className="flex items-center gap-2">
              <input 
                type="range"
                min="1"
                max={totalSteps}
                value={activeStepIndex}
                onChange={(e) => onSelectStepIndex(parseInt(e.target.value))}
                className="flex-1 accent-indigo-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
              />
            </div>

            {/* Scrubber playback controls */}
            <div className="flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-900 rounded-lg p-1.5">
              <button
                onClick={() => onSelectStepIndex(1)}
                disabled={activeStepIndex === 1}
                className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="First Step"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onSelectStepIndex(Math.max(1, activeStepIndex - 1))}
                disabled={activeStepIndex === 1}
                className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer transition ${
                  isPlaying ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                }`}
              >
                {isPlaying ? 'PAUSE' : 'REPLAY'}
              </button>

              <button
                onClick={() => onSelectStepIndex(Math.min(totalSteps, activeStepIndex + 1))}
                disabled={activeStepIndex === totalSteps}
                className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onSelectStepIndex(totalSteps)}
                disabled={activeStepIndex === totalSteps}
                className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Last Step"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Current State Detail Card */}
        {currentTrace && activeEvent && (
          <div className="space-y-3 animate-fade-in">
            {/* Event Header Info */}
            <div className="p-3 bg-slate-950 border border-slate-900/80 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                  {activeEvent.type} EVENT
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Line {activeEvent.line} ({activeEvent.functionName})
                </span>
              </div>

              {activeEvent.codeLine && (
                <div className="p-2 bg-[#06080C] border border-slate-900 rounded font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto border-l-2 border-indigo-500">
                  {activeEvent.codeLine}
                </div>
              )}

              {activeEvent.outcome && (
                <p className="text-[11px] font-medium text-amber-400 bg-amber-500/5 p-1.5 border border-amber-500/10 rounded leading-normal">
                  {activeEvent.outcome}
                </p>
              )}
            </div>

            {/* Variable Scope state viewer */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Local Scope Snapshot
              </span>

              <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-2 font-mono text-xs">
                {Object.keys(activeEvent.snapshot).length === 0 ? (
                  <div className="text-slate-600 text-xs italic">Scope is empty</div>
                ) : (
                  Object.entries(activeEvent.snapshot).map(([key, val]) => {
                    // Check if this variable was updated in this step
                    const isUpdated = activeEvent.type === 'assign' && 
                      (activeEvent.variableName === key || activeEvent.variableName?.startsWith(key + '.'));

                    return (
                      <div 
                        key={key} 
                        className={`flex items-start justify-between py-1 px-1.5 rounded transition-all duration-350 ${
                          isUpdated ? 'bg-indigo-950/40 text-indigo-300 border-l border-indigo-500 font-bold' : ''
                        }`}
                      >
                        <span className="text-slate-400">{key}</span>
                        <span className="text-right text-slate-300 truncate max-w-xs" title={JSON.stringify(val)}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Stdout view for tracing */}
            {currentTrace.stdout.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-slate-400" />
                  Terminal Output (Buffered)
                </span>
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg font-mono text-[10px] text-slate-400 space-y-1 h-24 overflow-y-auto">
                  {currentTrace.stdout.map((out, idx) => (
                    <div key={idx} className="truncate select-text">{out}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounded AI Inquiry Form */}
            <div className="p-3.5 bg-indigo-950/10 border border-indigo-900/30 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">Grounded AI Inquiry</h4>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Ask causal questions grounded explicitly in the recorded values of this run.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAskCausalQuestion('why-null')}
                  className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-300 rounded text-left transition cursor-pointer flex items-center justify-between"
                >
                  <span>Why is user null/NaN here?</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                </button>
                <button
                  onClick={() => handleAskCausalQuestion('where-diverged')}
                  disabled={!isComparisonMode}
                  className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-300 rounded text-left transition cursor-pointer flex items-center justify-between disabled:opacity-35"
                >
                  <span>Where did runs diverge?</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask a custom question..."
                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-300 pr-8 focus:outline-none focus:border-indigo-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskCausalQuestion('general');
                  }}
                />
                <button
                  onClick={() => handleAskCausalQuestion('general')}
                  className="absolute right-1.5 top-1.5 text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when trace isn't generated yet */}
        {!currentTrace && (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-slate-800 rounded-lg p-6 bg-slate-950/20">
            <Cpu className="h-8 w-8 text-slate-850 animate-pulse" />
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ready to trace</h4>
            <p className="text-[10px] text-slate-650 max-w-xs leading-normal">
              Click <strong className="text-indigo-400">Debug with Trace</strong> above to run this code inside the sandboxed tracing monitor and record scope histories step-by-step.
            </p>
          </div>
        )}
      </div>

      {/* Loop Threshold Warning Modal */}
      {showLoopWarning && warningDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11141a] border-2 border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Trace Loop Threshold Exceeded</h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Prism Trace Engine detected a loop with <span className="text-amber-400 font-extrabold font-mono">{warningDetails.actualCount}</span> iterations in <span className="text-slate-200 font-mono font-bold">{activeFile?.name}</span>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-850 text-[11px] text-slate-300 leading-normal space-y-1.5">
              <span className="font-extrabold text-amber-500 uppercase tracking-wider text-[9px] block">Stability & Performance Alert:</span>
              <span>Running a full trace with more than 500 iterations can cause high memory utilization, browser freeze, or slow down the live debugger iframe visualization.</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleConfirmTruncate}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer text-center shadow-lg shadow-indigo-600/10"
              >
                Truncate Trace (100 steps - Recommended)
              </button>
              <button
                onClick={handleConfirmContinue}
                className="w-full py-2 bg-[#1f242f] hover:bg-[#2a303e] text-slate-300 hover:text-white border border-[#222733] text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer text-center"
              >
                Continue anyway (Full {warningDetails.actualCount} iterations)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
