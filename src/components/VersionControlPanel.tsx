import React from 'react';
import { GitBranch, GitCommit, Clock, ArrowRight, Eye, RefreshCw, EyeOff } from 'lucide-react';
import { VCCommit } from '../types';

interface VersionControlPanelProps {
  commits: VCCommit[];
  activeCommitHash: string | null;
  onCheckout: (hash: string) => void;
  onToggleDiff: (commit: VCCommit | null) => void;
  diffCommit: VCCommit | null;
}

export default function VersionControlPanel({
  commits,
  activeCommitHash,
  onCheckout,
  onToggleDiff,
  diffCommit,
}: VersionControlPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-slate-300 border-l border-slate-800 font-sans" id="version-control-panel">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-indigo-400" />
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Version Control</h2>
        </div>
        <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 font-mono font-semibold uppercase tracking-wider">
          Local Engine
        </div>
      </div>

      {/* Main timeline listing */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          Commit Checkpoints
        </div>

        <div className="relative pl-6 space-y-6">
          {/* Vertical Branch Line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-800/80 border-dashed border-l border-slate-800" />

          {commits.map((commit, index) => {
            const isCurrent = activeCommitHash === commit.hash;
            const isDiffing = diffCommit?.hash === commit.hash;

            return (
              <div key={commit.hash} className="relative group">
                {/* Branch Circle Node */}
                <div
                  className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-indigo-500 border-indigo-400 ring-4 ring-indigo-500/15 scale-115'
                      : isDiffing
                      ? 'bg-amber-500 border-amber-400 ring-4 ring-amber-500/15 scale-115'
                      : 'bg-slate-950 border-slate-800 hover:border-indigo-500'
                  }`}
                >
                  <div className={`h-1 w-1 rounded-full ${isCurrent ? 'bg-white' : 'bg-transparent'}`} />
                </div>

                {/* Commit Meta Card */}
                <div
                  className={`p-3.5 bg-slate-950/40 border rounded transition-all space-y-2.5 ${
                    isCurrent
                      ? 'border-indigo-500/40 bg-[#0A0C10]'
                      : isDiffing
                      ? 'border-amber-500/40 bg-[#0A0C10]'
                      : 'border-slate-800/80 hover:border-slate-750 bg-slate-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                      {commit.hash}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {commit.timestamp}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-200 leading-normal font-medium">{commit.description}</p>
                    <div className="text-[10px] text-slate-500">
                      Author: <span className="font-mono text-slate-300">{commit.author}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-900/40">
                    {/* Checkout (Rollback/Checkout) */}
                    <button
                      onClick={() => onCheckout(commit.hash)}
                      disabled={isCurrent}
                      className={`flex-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition ${
                        isCurrent
                          ? 'bg-slate-900/60 text-slate-600 border border-slate-900 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                      }`}
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>{isCurrent ? 'Active' : 'Checkout'}</span>
                    </button>

                    {/* Diff View Comparison Toggle */}
                    <button
                      onClick={() => onToggleDiff(isDiffing ? null : commit)}
                      className={`flex-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 border transition cursor-pointer ${
                        isDiffing
                          ? 'bg-amber-600/10 border-amber-500/40 text-amber-400'
                          : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      {isDiffing ? (
                        <>
                          <EyeOff className="h-3 w-3 text-amber-400" />
                          <span>Exit Diff</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 text-indigo-400" />
                          <span>View Diff</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
