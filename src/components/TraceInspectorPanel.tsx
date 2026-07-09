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
  isAIAnswering
}: TraceInspectorPanelProps) {
  const [payloadA, setPayloadA] = useState('{"name": "Alice", "age": null}');
  const [payloadB, setPayloadB] = useState('{"name": "Bob", "age": 25}');
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isTraceRunning, setIsTraceRunning] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

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
      onTraceUpdated(traceA);
      onSelectStepIndex(1);

      if (isComparisonMode) {
        const traceB = generateExecutionTrace(activeFile, payloadB);
        onComparisonTraceUpdated(traceB);
      } else {
        onComparisonTraceUpdated(null);
      }
      setIsTraceRunning(false);
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

  return (
    <div className="h-full flex flex-col bg-[#0B0D13] border-l border-slate-900 select-none text-slate-300 font-sans" id="trace-panel">
      {/* Panel Header */}
      <div className="h-12 border-b border-slate-900 flex items-center justify-between px-4 bg-[#0F111A]">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">
            Prism Trace Engine
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono font-bold tracking-wider">
            V8 Dynamic Probe
          </span>
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
    </div>
  );
}
