import React, { useState } from 'react';
import { 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  MessageSquare, 
  Award, 
  Sparkles, 
  BookOpen, 
  Play, 
  Lightbulb, 
  Eye, 
  RefreshCw, 
  Activity, 
  Network, 
  ArrowDown
} from 'lucide-react';
import { AIDebugResult, AIExplainResult, AITutorResult, CodeFile } from '../types';

interface AIDebuggerTabsProps {
  activeFile: CodeFile | null;
  debugResult: AIDebugResult | null;
  explainResult: AIExplainResult | null;
  tutorResult: AITutorResult | null;
  activeTab: 'debug' | 'explain' | 'tutor';
  setActiveTab: (tab: 'debug' | 'explain' | 'tutor') => void;
  onApplyFix: (bugId: string, fixCode: string) => void;
  onVerifyTutorAnswer: (answer: string) => void;
  isVerifyingAnswer: boolean;
  tutorVerificationFeedback: string | null;
  onStartTutor?: () => void;
  groundedAIResponse?: { question: string; response: string; step: number; isDivergence?: boolean } | null;
  onSelectTraceStep?: (step: number) => void;
  onClearGroundedResponse?: () => void;
  isGroundedRunning?: boolean;
}

export default function AIDebuggerTabs({
  activeFile,
  debugResult,
  explainResult,
  tutorResult,
  activeTab,
  setActiveTab,
  onApplyFix,
  onVerifyTutorAnswer,
  isVerifyingAnswer,
  tutorVerificationFeedback,
  onStartTutor,
  groundedAIResponse,
  onSelectTraceStep,
  onClearGroundedResponse,
  isGroundedRunning,
}: AIDebuggerTabsProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedFlowStepId, setSelectedFlowStepId] = useState<string | null>(null);
  
  // Explainer View mode: 'flowchart' | 'sequential'
  const [explainViewMode, setExplainViewMode] = useState<'flowchart' | 'sequential'>('flowchart');
  
  // Tutor help levels
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [simplerQuestionRequested, setSimplerQuestionRequested] = useState(false);

  const renderInteractiveNarrative = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[Step\s*#\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[Step\s*#(\d+)\]/);
      if (match) {
        const stepNum = parseInt(match[1]);
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (onSelectTraceStep) {
                onSelectTraceStep(stepNum);
              }
            }}
            className="px-1.5 py-0.5 rounded bg-indigo-500/25 hover:bg-indigo-500/45 border border-indigo-500/40 text-indigo-300 hover:text-white text-[10px] font-extrabold font-mono transition cursor-pointer select-none inline-flex items-center gap-0.5 mx-0.5 align-middle"
            title={`Jump to Step #${stepNum}`}
          >
            Step #{stepNum}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSubmitTutorAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    onVerifyTutorAnswer(userAnswer.trim());
    setUserAnswer('');
    setShowHint(false);
    setShowSolution(false);
  };

  const getFlowStepTypeColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
      case 'condition': return 'bg-amber-500/10 border-amber-500 text-amber-400';
      case 'loop': return 'bg-purple-500/10 border-purple-500 text-purple-400';
      case 'end': return 'bg-rose-500/10 border-rose-500 text-rose-400';
      default: return 'bg-blue-500/10 border-blue-500 text-blue-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161a22] text-slate-300 border-l border-[#222733] font-sans" id="ai-debugger-tabs">
      {/* Tabs list */}
      <div className="grid grid-cols-3 border-b border-[#222733] text-center bg-[#11141a] text-xs">
        <button
          onClick={() => setActiveTab('debug')}
          className={`py-3 font-semibold transition uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'debug'
              ? 'border-b-2 border-indigo-500 text-indigo-400 bg-[#161a22]'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Debugger</span>
        </button>
        <button
          onClick={() => setActiveTab('explain')}
          className={`py-3 font-semibold transition uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'explain'
              ? 'border-b-2 border-indigo-500 text-indigo-400 bg-[#161a22]'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Explainer</span>
        </button>
        <button
          onClick={() => setActiveTab('tutor')}
          className={`py-3 font-semibold transition uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'tutor'
              ? 'border-b-2 border-indigo-500 text-indigo-400 bg-[#161a22]'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>AI Tutor</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: DEBUGGER */}
        {activeTab === 'debug' && (
          <div className="space-y-4">
            {!debugResult ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <AlertTriangle className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-xs font-semibold">Ready to Debug Codebase</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-normal">
                  Click "AI Debugger" above to perform a deep analysis of errors, vulnerabilities, or logic flaws.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-950/80 p-3.5 border border-slate-800 rounded-lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Core Diagnostic Summary
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{debugResult.summary}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identified Bugs ({debugResult.bugs.length})</h3>

                  {debugResult.bugs.map((bug) => (
                    <div key={bug.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-850 text-slate-300 border border-slate-800">
                          Line {bug.line}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          bug.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {bug.severity} severity
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-slate-200">{bug.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{bug.description}</p>
                      </div>

                      {/* Mentorship / Step by step guide */}
                      <div className="bg-slate-900 p-3 rounded-md border border-slate-850/50 space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tutor Guide to Solve:</div>
                        <ul className="space-y-1 pl-1">
                          {bug.stepByStepHelp.map((step, idx) => (
                            <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-normal">
                              <span className="text-amber-500 font-bold select-none">{idx + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Interactive Tutoring offer right inside the bug card! */}
                        {onStartTutor && (
                          <button
                            onClick={() => {
                              onStartTutor();
                              setActiveTab('tutor');
                            }}
                            className="w-full mt-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Play className="h-3 w-3" />
                            <span>Interactive Tutoring: Solve this together</span>
                          </button>
                        )}
                      </div>

                      {/* Apply suggested code fix directly */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Correction:</div>
                        <pre className="p-2 bg-slate-900 border border-slate-850 rounded text-[10px] font-mono overflow-x-auto text-emerald-400 whitespace-pre">
                          {bug.suggestedFix}
                        </pre>
                        <button
                          onClick={() => onApplyFix(bug.id, bug.suggestedFix)}
                          className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold tracking-wider uppercase rounded flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 transition cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Apply AI Code Fix</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPLAINER */}
        {activeTab === 'explain' && (
          <div className="space-y-4">
            {/* Grounded Trace Explanation Block */}
            {groundedAIResponse && (
              <div className="bg-indigo-950/20 border-2 border-indigo-500/30 rounded-xl p-4 space-y-3 animate-fade-in shadow-lg shadow-indigo-500/5" id="grounded-ai-response-card">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">GROUNDED NARRATIVE ANALYSIS</span>
                  </div>
                  {onClearGroundedResponse && (
                    <button
                      onClick={onClearGroundedResponse}
                      type="button"
                      className="text-[9px] font-bold text-slate-500 hover:text-slate-300 transition uppercase tracking-wider cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Causal Question:</span>
                  <p className="text-xs font-semibold text-slate-200">"{groundedAIResponse.question}"</p>
                </div>
                
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trace-Grounded Explanation:</span>
                  <div className="text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                    {renderInteractiveNarrative(groundedAIResponse.response)}
                  </div>
                </div>
                
                <div className="text-[9px] text-indigo-400/80 font-medium leading-normal bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-500/10 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400 animate-pulse" />
                  <span>
                    Click any of the highlighted <strong>Step #X</strong> tokens above to automatically synchronize the timeline scrubber and highlight the exact line of code in the editor!
                  </span>
                </div>
              </div>
            )}

            {!explainResult && !groundedAIResponse ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <BookOpen className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-xs font-semibold">Complex Flow Visualization</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-normal">
                  Click "Explain Logic" above to build a mental map of execution flow, conditions, and calculations. Or run "Debug with Trace" to ask trace-grounded questions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {explainResult && (
                  <>
                    <div className="bg-slate-950/80 p-3.5 border border-slate-800 rounded-lg">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5">Functional Purpose</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{explainResult.summary}</p>
                    </div>

                    {/* View Mode selection */}
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Logic execution</h3>
                      <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5">
                        <button
                          onClick={() => setExplainViewMode('flowchart')}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                            explainViewMode === 'flowchart'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Visual Flowchart
                        </button>
                        <button
                          onClick={() => setExplainViewMode('sequential')}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                            explainViewMode === 'sequential'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          List View
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Interactive Flow Diagram */}
                {explainViewMode === 'flowchart' ? (
                  /* HIGH-FIDELITY INTERACTIVE FLOWCHART */
                  <div className="space-y-3">
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center space-y-4">
                      {explainResult.logicFlowDiagram.map((step, idx) => {
                        const isSelected = selectedFlowStepId === step.id;
                        
                        return (
                          <div key={step.id} className="w-full flex flex-col items-center">
                            {/* Step block card representing flowchart node */}
                            <div
                              onClick={() => setSelectedFlowStepId(isSelected ? null : step.id)}
                              className={`w-full max-w-sm p-3.5 bg-slate-900 border rounded-xl cursor-pointer transition relative group ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-950/10 shadow-lg shadow-indigo-500/5 scale-[1.02]'
                                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950">
                                    0{idx + 1}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 transition">
                                    {step.title}
                                  </h4>
                                </div>
                                <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${getFlowStepTypeColor(step.type)}`}>
                                  {step.type}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-400 leading-normal mb-2">{step.description}</p>

                              {/* Highlighted code drawer inside active flowchart card */}
                              {isSelected && step.codeSnippet && (
                                <div className="mt-2.5 animate-fade-in">
                                  <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                    <Network className="h-3 w-3 text-indigo-400 animate-pulse" />
                                    <span>Scope Code Snippet</span>
                                  </div>
                                  <pre className="p-2 bg-black border border-slate-850 rounded text-[10px] font-mono overflow-x-auto text-indigo-300 whitespace-pre">
                                    {step.codeSnippet}
                                  </pre>
                                </div>
                              )}

                              {step.nextSteps.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500">
                                  <span>Proceeds to:</span>
                                  <span className="font-mono text-indigo-400 font-bold">{step.nextSteps.join(', ')}</span>
                                </div>
                              )}
                            </div>

                            {/* Down Arrow connector if not the last item */}
                            {idx < explainResult.logicFlowDiagram.length - 1 && (
                              <div className="my-2 text-indigo-500/60 flex flex-col items-center select-none">
                                <ArrowDown className="h-5 w-5 animate-bounce" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Standard Sequential List view */
                  <div className="space-y-3">
                    <div className="relative space-y-4 pl-3 border-l border-slate-800">
                      {explainResult.logicFlowDiagram.map((step, idx) => {
                        const isSelected = selectedFlowStepId === step.id;

                        return (
                          <div key={step.id} className="relative">
                            {/* Left dot connector */}
                            <div className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-800 border border-slate-700" />

                            {/* Step card */}
                            <div
                              onClick={() => setSelectedFlowStepId(isSelected ? null : step.id)}
                              className={`p-3 bg-slate-950 border rounded-lg cursor-pointer transition space-y-1.5 ${
                                isSelected
                                  ? 'border-blue-500 bg-slate-950/90 shadow-md shadow-blue-500/5'
                                  : 'border-slate-800 hover:border-slate-750'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                                  <span>{step.title}</span>
                                </h4>
                                <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${getFlowStepTypeColor(step.type)}`}>
                                  {step.type}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-400 leading-normal">{step.description}</p>

                              {isSelected && step.codeSnippet && (
                                <pre className="p-2 bg-slate-900 border border-slate-850 rounded text-[10px] font-mono overflow-x-auto text-blue-300 whitespace-pre">
                                  {step.codeSnippet}
                                </pre>
                              )}

                              {step.nextSteps.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <span>Proceeds to:</span>
                                  <span className="font-mono text-blue-400">{step.nextSteps.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-slate-950/50 p-3.5 border border-slate-850 rounded-lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Detailed Architectural Analysis</h3>
                  <div className="text-[11px] text-slate-400 leading-relaxed space-y-2 whitespace-pre-wrap">
                    {explainResult.detailedAnalysis}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI TUTOR */}
        {activeTab === 'tutor' && (
          <div className="space-y-4">
            {!tutorResult ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <Award className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-xs font-semibold">Interactive Mentorship Session</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-normal">
                  Click "AI Tutor Session" above or use "Let's Solve This Together" on a bug to break structural errors down into interactive step-by-step questions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Session Progress Header */}
                <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Interactive Mentor Mode</span>
                    <h3 className="text-xs font-bold text-slate-100 font-mono">
                      Step {Math.min(tutorResult.currentStepIndex + 1, tutorResult.steps.length)} of {tutorResult.steps.length}
                    </h3>
                  </div>
                  {/* Progress dots */}
                  <div className="flex items-center gap-1.5">
                    {tutorResult.steps.map((step, idx) => (
                      <span
                        key={idx}
                        className={`h-2.5 w-2.5 rounded-full border transition ${
                          step.completed
                            ? 'bg-emerald-500 border-emerald-500'
                            : idx === tutorResult.currentStepIndex
                            ? 'bg-amber-500/20 border-amber-500 animate-pulse'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                        title={`Step ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Active question */}
                {tutorResult.currentStepIndex < tutorResult.steps.length ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <HelpCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-100">
                          {simplerQuestionRequested ? "Simplified Concept Question:" : "Tutor Question:"}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {simplerQuestionRequested 
                            ? `Can you explain the basic role of this structure, or how we might safely double-check variables before using them in our active code segment? (Hint: check line bounds)`
                            : tutorResult.steps[tutorResult.currentStepIndex].question
                          }
                        </p>
                      </div>
                    </div>

                    {/* Hint buttons toggles */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowHint(!showHint)}
                          className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                          <span>{showHint ? 'Hide Clue' : 'Ask for a Hint'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSimplerQuestionRequested(!simplerQuestionRequested)}
                          className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
                          <span>{simplerQuestionRequested ? 'Restore Question' : 'Simplify Concepts'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowSolution(!showSolution)}
                          className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{showSolution ? 'Hide Solution' : 'Reveal answer'}</span>
                        </button>
                      </div>

                      {showHint && (
                        <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-md text-[11px] text-slate-300 flex items-start gap-2 animate-fade-in leading-relaxed">
                          <span className="text-amber-500 font-bold select-none shrink-0">💡 Hint:</span>
                          <span>{tutorResult.steps[tutorResult.currentStepIndex].hint}</span>
                        </div>
                      )}

                      {showSolution && (
                        <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-md text-[11px] text-emerald-300 flex items-start gap-2 animate-fade-in leading-relaxed">
                          <span className="text-emerald-400 font-bold select-none shrink-0">✔ Solution Outline:</span>
                          <div>
                            To pass this step, describe why avoiding out-of-bounds indices, checking null parameters, or wrapping async actions in stable try-catch blocks safeguards code integrity. You can submit: "Check bounds and raise protective exceptions."
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Answer submission form */}
                    <form onSubmit={handleSubmitTutorAnswer} className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Your Explanation or Solution:</label>
                        <textarea
                          rows={3}
                          placeholder="Explain how to resolve this step, or write corrected code details here..."
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-slate-750 focus:border-emerald-500 text-slate-200 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isVerifyingAnswer}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-500/10"
                      >
                        <span>{isVerifyingAnswer ? 'Verifying with AI Mentor...' : 'Submit Answer'}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </form>

                    {/* Feedback container */}
                    {tutorVerificationFeedback && (
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-md space-y-1">
                        <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> Tutor Feedback:
                        </span>
                        <p className="text-[11px] text-slate-300 leading-normal">{tutorVerificationFeedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-center space-y-4">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Award className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-100">Mentorship Complete!</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Excellent work! You have successfully stepped through and resolved the structural errors in this file under the guidance of our AI Pair Programming Mentor.
                      </p>
                      
                      {/* Restart Mentorship */}
                      {onStartTutor && (
                        <button
                          onClick={onStartTutor}
                          className="mt-2 py-1.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Restart Tutoring Session</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
