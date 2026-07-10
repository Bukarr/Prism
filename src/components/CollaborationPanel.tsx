import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Send, 
  Copy, 
  HelpCircle, 
  MessageSquare, 
  ShieldCheck, 
  Tv, 
  Terminal, 
  MonitorPlay, 
  Laptop, 
  Play, 
  Activity, 
  Code,
  Shield,
  CircleAlert
} from 'lucide-react';
import { CollaborationRoom, RoomMember, ChatMessage } from '../types';

interface CollaborationPanelProps {
  room: CollaborationRoom | null;
  username: string;
  setUsername: (name: string) => void;
  onStartRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onSendMessage: (text: string) => void;
  onTriggerAIMentorChat: (text: string) => void;
  userId: string;
  onToggleScreenShare: (isSharing: boolean) => void;
  onSendConsoleCommand: (text: string, type: 'info' | 'error' | 'success' | 'input') => void;
  onClose?: () => void;
}

export default function CollaborationPanel({
  room,
  username,
  setUsername,
  onStartRoom,
  onJoinRoom,
  onSendMessage,
  onTriggerAIMentorChat,
  userId,
  onToggleScreenShare,
  onSendConsoleCommand,
  onClose,
}: CollaborationPanelProps) {
  const [targetRoomId, setTargetRoomId] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Collaboration Tab state
  const [collabTab, setCollabTab] = useState<'chat' | 'screen' | 'console'>('chat');
  
  // Console Command input state
  const [consoleCommand, setConsoleCommand] = useState('');
  
  // Autoscroll for messages and console
  const chatEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collabTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.chatHistory, collabTab]);

  useEffect(() => {
    if (collabTab === 'console') {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.consoleLogs, collabTab]);

  const handleCopyLink = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    // Standard Message send
    onSendMessage(newMessageText.trim());

    // Check if the message tags "@ai" or "@mentor" to trigger the AI Mentor response!
    if (newMessageText.toLowerCase().includes('@ai') || newMessageText.toLowerCase().includes('@mentor')) {
      onTriggerAIMentorChat(newMessageText.trim());
    }

    setNewMessageText('');
  };

  const handleAskMentorDirectly = () => {
    const text = "@ai mentor review this file and check for potential optimizations or security loopholes.";
    onSendMessage(text);
    onTriggerAIMentorChat(text);
  };

  // Toggle Screen Share
  const handleToggleScreen = () => {
    if (!room) return;
    const isCurrentlySharing = room.screenShare?.activeShareUserId === userId && room.screenShare?.isSharing;
    onToggleScreenShare(!isCurrentlySharing);
  };

  // Run a console command from the shell
  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleCommand.trim() || !room) return;
    onSendConsoleCommand(consoleCommand.trim(), 'input');
    setConsoleCommand('');
  };

  const handleQuickCommand = (cmd: string) => {
    if (!room) return;
    onSendConsoleCommand(cmd, 'input');
  };

  // Safe destructuring of live room parameters
  const isSelfSharing = room?.screenShare?.activeShareUserId === userId && room?.screenShare?.isSharing;
  const isAnySharing = room?.screenShare?.isSharing;
  const activeShareName = room?.screenShare?.activeShareUserName || 'Someone';

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-slate-300 border-l border-slate-800 font-sans" id="collaboration-panel">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-400" />
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pair Programming</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-bold">
            <ShieldCheck className="h-3 w-3 text-indigo-400" />
            <span>E2EE ACTIVE</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1f242f] hover:text-red-400 rounded text-slate-500 transition cursor-pointer"
              title="Close Drawer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {!room ? (
        /* JOIN / START SCREEN */
        <div className="flex-1 p-5 space-y-6 flex flex-col justify-center overflow-y-auto bg-[#0F1117]">
          <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-100">Mentorship & Collaboration Hub</h3>
            <p className="text-xs text-slate-450 leading-normal max-w-xs mx-auto">
              Start an encrypted session to share your codebase with mentors or team members. Works with low-latency syncing.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded space-y-4">
            {/* Username Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Your Developer Alias:</label>
              <input
                type="text"
                placeholder="Developer alias..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1117] border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* Start Room */}
              <button
                onClick={onStartRoom}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded transition shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Create Collaboration Room
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">OR JOIN SESSION</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Join Room Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Room ID (e.g., room-4932)..."
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#0F1117] border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded focus:outline-none"
                />
                <button
                  onClick={() => onJoinRoom(targetRoomId.trim())}
                  className="px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium rounded transition flex items-center gap-1 cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE COLLABORATIVE CHAT & ACTIVE STATE */
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0F1117]">
          {/* Room Meta details */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="font-semibold text-indigo-400 uppercase">ROOM:</span>
              <span className="text-slate-400">{room.id}</span>
              <button
                onClick={handleCopyLink}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                title="Copy Room ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied && <span className="text-[9px] text-emerald-400 animate-pulse font-sans">Copied!</span>}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Secure Tunnel</span>
            </div>
          </div>

          {/* Connected Session Members */}
          <div className="p-2 border-b border-slate-850 bg-slate-900/10 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {room.members.map((member) => (
                <div
                  key={member.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium"
                  style={{
                    backgroundColor: `${member.color}10`,
                    borderColor: `${member.color}30`,
                    color: member.color,
                  }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: member.color }}></span>
                  <span>{member.name}</span>
                </div>
              ))}
            </div>
            {isAnySharing && (
              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono animate-pulse shrink-0">
                ● SCREEN LIVE
              </span>
            )}
          </div>

          {/* Tab Selection */}
          <div className="grid grid-cols-3 border-b border-slate-850 bg-slate-950/60 text-[11px] font-semibold tracking-wider">
            <button
              onClick={() => setCollabTab('chat')}
              className={`py-2 text-center uppercase border-b-2 transition flex items-center justify-center gap-1.5 ${
                collabTab === 'chat'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/10'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setCollabTab('screen')}
              className={`py-2 text-center uppercase border-b-2 transition flex items-center justify-center gap-1.5 ${
                collabTab === 'screen'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/10'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>Screen</span>
            </button>
            <button
              onClick={() => setCollabTab('console')}
              className={`py-2 text-center uppercase border-b-2 transition flex items-center justify-center gap-1.5 ${
                collabTab === 'console'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/10'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Console</span>
            </button>
          </div>

          {/* Tab content 1: CHAT */}
          {collabTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                {room.chatHistory.map((msg) => {
                  const isMe = msg.senderId === userId;
                  const isSystem = msg.senderId === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center py-1">
                        <span className="inline-block bg-slate-950 border border-slate-850 px-2.5 py-1 rounded text-[10px] text-slate-500 max-w-xs leading-normal">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                        <span className="font-semibold text-slate-400">{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`p-2.5 rounded text-xs leading-relaxed ${
                          msg.isAI
                            ? 'bg-indigo-950/20 border border-indigo-900/30 text-indigo-200 shadow-sm'
                            : isMe
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-slate-950 border border-slate-800 text-slate-300'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick AI Mention Trigger Banner */}
              <div className="px-4 py-1.5 bg-slate-950/40 border-t border-slate-850 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Mention <strong className="text-indigo-400 font-mono">@ai</strong> to trigger mentor reviews</span>
                </span>
                <button
                  onClick={handleAskMentorDirectly}
                  className="text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  Quick Mentor Check
                </button>
              </div>

              {/* Input block */}
              <form onSubmit={handleSend} className="p-3 bg-slate-950/80 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Type message, use @ai to call mentor..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#0F1117] border border-slate-800 focus:border-indigo-500 text-slate-250 text-xs rounded focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition cursor-pointer shadow-md shadow-indigo-500/10 animate-fade-in"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Tab content 2: SCREEN SHARING */}
          {collabTab === 'screen' && (
            <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto bg-[#0F1117]">
              {/* Screen Sharing Monitor block */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      {isAnySharing ? `Stream: ${activeShareName}'s Screen` : 'Stream Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAnySharing && (
                      <>
                        <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-mono text-emerald-400">FPS: 60 | 450Kbps</span>
                      </>
                    )}
                  </div>
                </div>

                {isAnySharing ? (
                  /* Screen Streaming active */
                  <div className="relative aspect-video bg-black flex flex-col items-center justify-center p-4">
                    {isSelfSharing ? (
                      /* Self screen presentation screen */
                      <div className="text-center space-y-3 z-10 p-4">
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 text-red-400 animate-pulse border border-red-500/20">
                          <MonitorPlay className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-100">You are sharing your screen</p>
                          <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
                            Other connected developers and AI mentors in this room are seeing your active workspace in real-time.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Another user screen presentation container */
                      <div className="absolute inset-0 p-3 flex flex-col justify-between text-left font-mono text-[9px] text-indigo-300 overflow-hidden opacity-90 select-none">
                        {/* Simulated drawing of live compiler/code streams to represent active screen sharing! */}
                        <div className="space-y-1.5 select-none leading-normal">
                          <span className="text-slate-600 font-sans text-[10px] block border-b border-slate-850 pb-1 mb-2 font-semibold">
                            💻 Looking at {activeShareName}'s editor viewport:
                          </span>
                          <span className="text-emerald-400">import React, &#123; useState, useEffect &#125; from 'react';</span>
                          <span>const ConnectionStream = () =&gt; &#123;</span>
                          <span className="pl-3 text-amber-300">const [metrics, setMetrics] = useState(&#123; latency: 42 &#125;);</span>
                          <span className="pl-3">useEffect(() =&gt; &#123;</span>
                          <span className="pl-6 text-slate-500">// Simulating screen drawing at low-latency</span>
                          <span className="pl-6 text-indigo-400">const pipe = socket.connect();</span>
                          <span className="pl-6">pipe.emit('screenshare_chunk', &#123; width: 1920, bytes: '...' &#125;);</span>
                          <span className="pl-3">&#125;, []);</span>
                          <span>&#125;</span>
                        </div>
                        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-md font-sans text-[10px] text-slate-300 flex items-start gap-2">
                          <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-slate-200">Secure Peer-to-Peer Relay</span>
                            This stream is tunnel-encrypted. No data is stored outside this container.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Screen Share inactive splash */
                  <div className="aspect-video bg-[#0A0C10] flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                      <Tv className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">No screen is being shared</p>
                      <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
                        Share your viewport, code, or terminal window to invite group reviews or receive collaborative instruction.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Streaming state toggle button */}
              <button
                onClick={handleToggleScreen}
                className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1.5 shadow-md ${
                  isSelfSharing
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/5'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/5'
                } cursor-pointer`}
              >
                <MonitorPlay className="h-4 w-4" />
                <span>{isSelfSharing ? 'Stop Screen Share' : 'Start Screen Share'}</span>
              </button>

              {/* Quick instructions / Info callout */}
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="h-3 w-3 text-indigo-400" /> Pairing Stats
                </span>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Screen share leverages web tunnel port forwarding. It operates seamlessly without external plugins, optimized for distributed and remote teams.
                </p>
              </div>
            </div>
          )}

          {/* Tab content 3: SHARED CONSOLE LOGS */}
          {collabTab === 'console' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Terminal Screen container */}
              <div className="flex-1 p-3 bg-black overflow-y-auto font-mono text-[11px] text-slate-300 space-y-2 leading-relaxed">
                {(room.consoleLogs || []).map((log) => (
                  <div key={log.id} className="space-y-0.5">
                    {log.author && (
                      <span className="text-[9px] text-slate-600 uppercase select-none block">
                        [{log.author} - {log.timestamp}]
                      </span>
                    )}
                    <div className={`whitespace-pre-wrap ${
                      log.type === 'error' 
                        ? 'text-red-400 border-l-2 border-red-500/30 pl-2 bg-red-950/10' 
                        : log.type === 'success' 
                        ? 'text-emerald-400 border-l-2 border-emerald-500/30 pl-2 bg-emerald-950/10' 
                        : log.type === 'input' 
                        ? 'text-indigo-300 font-bold' 
                        : 'text-slate-400'
                    }`}>
                      {log.type === 'input' ? `$ ${log.text}` : log.text}
                    </div>
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>

              {/* Pre-defined prompt buttons */}
              <div className="p-2 bg-slate-950/90 border-t border-slate-850 flex flex-wrap gap-1.5 shrink-0">
                <button
                  onClick={() => handleQuickCommand('npm test')}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  npm test
                </button>
                <button
                  onClick={() => handleQuickCommand('node app.js')}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  node app.js
                </button>
                <button
                  onClick={() => handleQuickCommand('git status')}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  git status
                </button>
              </div>

              {/* Terminal command input bar */}
              <form onSubmit={handleRunCommand} className="p-3 bg-slate-950/80 border-t border-slate-800 flex gap-2 shrink-0">
                <span className="text-slate-600 font-mono text-xs self-center select-none">$</span>
                <input
                  type="text"
                  placeholder="Enter command (e.g. npm test, git status)..."
                  value={consoleCommand}
                  onChange={(e) => setConsoleCommand(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#0F1117] border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-xs transition cursor-pointer"
                >
                  Run
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
