export interface CodeFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface BugReport {
  id: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  stepByStepHelp: string[];
  suggestedFix: string;
}

export interface AIDebugResult {
  fileId: string;
  summary: string;
  bugs: BugReport[];
}

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  codeSnippet?: string;
  type: 'start' | 'process' | 'condition' | 'loop' | 'end';
  nextSteps: string[];
}

export interface AIExplainResult {
  fileId: string;
  summary: string;
  logicFlowDiagram: FlowStep[];
  detailedAnalysis: string;
}

export interface AITutorStep {
  question: string;
  hint: string;
  completed: boolean;
  userAnswer?: string;
  feedback?: string;
}

export interface AITutorResult {
  fileId: string;
  steps: AITutorStep[];
  currentStepIndex: number;
}

export interface CursorPosition {
  line: number;
  ch: number;
}

export interface RoomMember {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  activeFileId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isAI?: boolean;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  activeFileId: string;
  members: RoomMember[];
  chatHistory: ChatMessage[];
  files: Record<string, string>; // fileId -> content
  screenShare?: {
    activeShareUserId?: string;
    activeShareUserName?: string;
    isSharing: boolean;
  };
  consoleLogs?: Array<{
    id: string;
    type: 'info' | 'error' | 'success' | 'input';
    text: string;
    timestamp: string;
    author?: string;
  }>;
}

export interface VCCommit {
  id: string;
  hash: string;
  timestamp: string;
  description: string;
  author: string;
  files: Record<string, string>; // fileId -> content snapshot
}

export interface TraceEvent {
  step: number;
  functionName: string;
  file: string;
  line: number;
  type: 'call' | 'return' | 'assign' | 'branch' | 'info';
  variableName?: string;
  value?: any;
  snapshot: Record<string, any>;
  codeLine?: string;
  outcome?: string;
}

export interface ExecutionTrace {
  id: string;
  timestamp: string;
  events: TraceEvent[];
  error?: string;
  stdout: string[];
  inputPayload?: string;
}

