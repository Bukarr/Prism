import React, { useRef, useEffect } from 'react';
import { Play, Sparkles, BookOpen, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { CodeFile, BugReport, RoomMember } from '../types';

interface EditorPanelProps {
  file: CodeFile | null;
  onContentChange: (content: string) => void;
  onAnalyzeDebug: () => void;
  onExplainLogic: () => void;
  onStartTutor: () => void;
  isAnalyzing: boolean;
  isExplaining: boolean;
  isTutoring: boolean;
  bugs: BugReport[];
  roomMembers: RoomMember[];
  userId: string;
  diffAgainstContent?: string | null; // For VC Diff Visualization
  activeTraceLine?: number | null;
  activeTraceStep?: number | null;
  activeTraceEvent?: any | null;
}

export default function EditorPanel({
  file,
  onContentChange,
  onAnalyzeDebug,
  onExplainLogic,
  onStartTutor,
  isAnalyzing,
  isExplaining,
  isTutoring,
  bugs,
  roomMembers,
  userId,
  diffAgainstContent,
  activeTraceLine,
  activeTraceStep,
  activeTraceEvent,
}: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 font-sans p-8">
        <Sparkles className="h-12 w-12 text-slate-700 mb-4 animate-pulse" />
        <p className="text-sm font-medium">No file selected in workspace</p>
        <p className="text-xs text-slate-600 mt-1">Select a file from the Codebase Workspace on the left or upload a folder.</p>
      </div>
    );
  }

  // Get other members working on this file
  const activeCollaborators = roomMembers.filter(
    (member) => member.id !== userId && member.activeFileId === file.id
  );

  const lines = file.content.split('\n');

  // Check if a line has a bug
  const getLineBug = (lineNum: number): BugReport | undefined => {
    return bugs.find((b) => b.line === lineNum);
  };

  // Render Diff if present
  const renderDiffMode = () => {
    if (!diffAgainstContent) return null;

    const originalLines = diffAgainstContent.split('\n');
    const currentLines = file.content.split('\n');

    // Simple diff display
    const maxLength = Math.max(originalLines.length, currentLines.length);
    const diffLines: React.ReactNode[] = [];

    for (let i = 0; i < maxLength; i++) {
      const orig = originalLines[i];
      const curr = currentLines[i];

      if (orig === curr) {
        diffLines.push(
          <div key={i} className="flex text-slate-400 font-mono text-xs py-0.5 select-none hover:bg-slate-900/40">
            <span className="w-12 text-slate-600 text-right pr-4 select-none">{i + 1}</span>
            <span className="w-12 text-slate-600 text-right pr-4 select-none">{i + 1}</span>
            <span className="pl-4 whitespace-pre-wrap">{curr}</span>
          </div>
        );
      } else {
        if (orig !== undefined) {
          diffLines.push(
            <div key={`del-${i}`} className="flex bg-red-950/45 text-red-300 font-mono text-xs py-0.5 select-none border-l-2 border-red-500">
              <span className="w-12 text-red-800 text-right pr-4 select-none">{i + 1}</span>
              <span className="w-12 text-slate-800 text-right pr-4 select-none">-</span>
              <span className="pl-4 whitespace-pre-wrap select-text">{orig || ' '}</span>
            </div>
          );
        }
        if (curr !== undefined) {
          diffLines.push(
            <div key={`add-${i}`} className="flex bg-emerald-950/45 text-emerald-300 font-mono text-xs py-0.5 select-none border-l-2 border-emerald-500">
              <span className="w-12 text-slate-800 text-right pr-4 select-none">-</span>
              <span className="w-12 text-emerald-800 text-right pr-4 select-none">{i + 1}</span>
              <span className="pl-4 whitespace-pre-wrap select-text">{curr || ' '}</span>
            </div>
          );
        }
      }
    }

    return (
      <div className="flex-1 overflow-auto bg-slate-950 p-4 border border-slate-800/80 rounded-lg">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
          <div className="text-xs font-semibold text-slate-300">Comparing Snapshot Changes (Line-by-Line Diff)</div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Added Lines
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500"></span> Deleted Lines
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-900/30 font-mono">
          {diffLines}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0C10] border-r border-slate-800 h-full overflow-hidden" id="editor-panel">
      {/* Editor Header / Toolbars */}
      <div className="p-4 border-b border-slate-800 bg-[#0F1117] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300 text-[11px] font-mono font-medium">
            {file.name}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {file.path}
          </span>
          {/* Active Collaborators bubble */}
          {activeCollaborators.length > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 animate-pulse">
              <User className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] text-indigo-300 font-medium">
                {activeCollaborators.map(c => c.name).join(', ')} is here
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAnalyzeDebug}
            disabled={isAnalyzing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition uppercase tracking-wider ${
              isAnalyzing
                ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 animate-pulse'
                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-md shadow-indigo-500/10'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Debugger'}</span>
          </button>

          <button
            onClick={onExplainLogic}
            disabled={isExplaining}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition uppercase tracking-wider ${
              isExplaining
                ? 'bg-slate-800 border-slate-700 text-slate-400 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
            }`}
          >
            <BookOpen className="h-3 w-3 text-indigo-400" />
            <span>{isExplaining ? 'Analyzing Flow...' : 'Explain Logic'}</span>
          </button>

          <button
            onClick={onStartTutor}
            disabled={isTutoring}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition uppercase tracking-wider ${
              isTutoring
                ? 'bg-slate-800 border-slate-700 text-slate-400 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
            }`}
          >
            <Play className="h-3 w-3 text-emerald-400" />
            <span>AI Tutor Session</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      {diffAgainstContent ? (
        renderDiffMode()
      ) : (
        <div className="flex-1 flex overflow-hidden relative bg-[#0A0C10]">
          {/* Editor Body */}
          <div className="flex-1 flex flex-col overflow-auto h-full p-4 font-mono text-xs">
            <div className="flex w-full min-h-full">
              {/* Line Numbers column */}
              <div className="w-10 select-none text-right pr-4 text-slate-700 flex flex-col gap-1 border-r border-slate-900/60">
                {lines.map((_, i) => {
                  const lineNum = i + 1;
                  const bug = getLineBug(lineNum);
                  const isTraceActive = activeTraceLine === lineNum;
                  
                  // Compute gutter color and background to match our design spectrum
                  let gutterColor = 'text-slate-600';
                  let gutterBg = '';
                  if (bug) {
                    gutterColor = bug.severity === 'high' ? 'text-rose-400 font-bold' : 'text-prism-branch font-bold';
                    gutterBg = bug.severity === 'high' ? 'bg-rose-950/20' : 'bg-prism-branch/15';
                  } else if (isTraceActive) {
                    if (activeTraceEvent?.type === 'call' || activeTraceEvent?.type === 'return') {
                      gutterColor = 'text-prism-call font-bold';
                      gutterBg = 'bg-prism-call/15';
                    } else if (activeTraceEvent?.type === 'assign') {
                      gutterColor = 'text-prism-state font-bold';
                      gutterBg = 'bg-prism-state/15';
                    } else if (activeTraceEvent?.type === 'branch') {
                      gutterColor = 'text-prism-branch font-bold';
                      gutterBg = 'bg-prism-branch/15';
                    } else {
                      gutterColor = 'text-prism-diverge font-bold';
                      gutterBg = 'bg-prism-diverge/15';
                    }
                  }

                  return (
                    <div
                      key={i}
                      className={`h-5 flex items-center justify-end text-[10px] px-1 transition-all duration-150 ${gutterColor} ${gutterBg}`}
                    >
                      {isTraceActive && <span className="mr-1 animate-pulse text-[8px]">▶</span>}
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              {/* Code Area with text overlaying and bug highlight capability */}
              <div className="flex-1 pl-4 relative flex flex-col gap-1">
                {/* Textarea for actual direct edits */}
                <textarea
                  ref={textareaRef}
                  value={file.content}
                  onChange={(e) => onContentChange(e.target.value)}
                  className="absolute inset-y-0 left-4 right-0 bg-transparent text-slate-400 focus:outline-none resize-none font-mono text-[13px] leading-5 whitespace-pre overflow-hidden h-full caret-indigo-400 select-text"
                  spellCheck="false"
                  style={{ lineHeight: '20px' }}
                />

                {/* Display mirror overlay for bug warnings and highlighted rows */}
                <div className="pointer-events-none w-full" style={{ lineHeight: '20px' }}>
                  {lines.map((lineContent, i) => {
                    const lineNum = i + 1;
                    const bug = getLineBug(lineNum);

                    return (
                      <div key={i} className="min-h-5 relative">
                        {/* Active Trace Line Highlight */}
                        {activeTraceLine === lineNum && (() => {
                          let colorClass = 'bg-indigo-500/15 border-indigo-400';
                          let textClass = 'text-indigo-300';
                          let eventSymbol = '●';
                          let eventText = `Step #${activeTraceStep}`;
                          
                          if (activeTraceEvent) {
                            if (activeTraceEvent.type === 'call' || activeTraceEvent.type === 'return') {
                              colorClass = 'bg-prism-call/10 border-prism-call';
                              textClass = 'text-prism-call';
                              eventSymbol = '●';
                              eventText = activeTraceEvent.type === 'call' 
                                ? `call ${activeTraceEvent.functionName}(${activeTraceEvent.variableName || ''})` 
                                : `return ${JSON.stringify(activeTraceEvent.value)}`;
                            } else if (activeTraceEvent.type === 'assign') {
                              colorClass = 'bg-prism-state/10 border-prism-state';
                              textClass = 'text-prism-state';
                              eventSymbol = '➔';
                              eventText = `assign ${activeTraceEvent.variableName} = ${typeof activeTraceEvent.value === 'object' ? JSON.stringify(activeTraceEvent.value) : String(activeTraceEvent.value)}`;
                            } else if (activeTraceEvent.type === 'branch') {
                              colorClass = 'bg-prism-branch/10 border-prism-branch';
                              textClass = 'text-prism-branch';
                              eventSymbol = '❖';
                              eventText = `branch: ${activeTraceEvent.outcome || 'taken'}`;
                            } else if (activeTraceEvent.type === 'diverge') {
                              colorClass = 'bg-prism-diverge/10 border-prism-diverge';
                              textClass = 'text-prism-diverge';
                              eventSymbol = '✖';
                              eventText = activeTraceEvent.outcome || 'diverged';
                            }
                          }
                          
                          return (
                            <div
                              className={`absolute inset-0 -left-4 w-[calc(100%+16px)] pointer-events-auto border-l-2 ${colorClass} flex items-center justify-between pr-2 pl-4 font-mono text-[10px] select-none`}
                              title={`Execution is currently at Step #${activeTraceStep}`}
                            >
                              <span className={`font-extrabold tracking-wider ${textClass} opacity-40 uppercase`}>
                                STEP {activeTraceStep}
                              </span>
                              <span className={`px-2 py-0.5 rounded bg-[#11141a]/95 border border-[#222733]/50 ${textClass} font-bold max-w-[70%] truncate shadow-md animate-fade-in`}>
                                <span className="mr-1.5 opacity-80">{eventSymbol}</span>
                                {eventText}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Highlights behind the text */}
                        {bug && (
                          <div
                            className={`absolute inset-0 -left-4 w-[calc(100%+16px)] pointer-events-auto cursor-help border-l-2 ${
                              bug.severity === 'high'
                                ? 'bg-rose-500/10 border-rose-500'
                                : 'bg-amber-500/10 border-amber-500'
                            }`}
                            title={`Bug Detected: ${bug.title}`}
                          />
                        )}

                        {/* Text characters with transparent placeholder to match offset */}
                        <span className="invisible whitespace-pre">{lineContent || ' '}</span>

                        {/* Inline bug cards directly under the target line - amazing developer UX */}
                        {bug && (
                          <div className="pointer-events-auto mt-1 mb-2 max-w-xl bg-slate-900 border border-indigo-500/50 p-4 rounded-lg flex items-start gap-3 shadow-2xl select-text">
                            {bug.severity === 'high' ? (
                              <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            )}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
                                  Line {bug.line}
                                </span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                                  bug.severity === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {bug.severity} severity
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-200">{bug.title}</h4>
                              <p className="text-[11px] text-slate-400 leading-normal">{bug.description}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Bar: Technical Details */}
      <footer className="h-8 bg-[#0F1117] border-t border-slate-800 px-4 flex items-center justify-between shrink-0 text-[10px] text-slate-500 font-mono select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span>LATENCY: 42ms</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
            <span>E2E ENCRYPTED (AES-256)</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <span>UTF-8</span>
          <span className="uppercase">{file.language} (STABLE)</span>
          <span>{lines.length} Lines</span>
        </div>
      </footer>
    </div>
  );
}
