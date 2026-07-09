import React, { useRef, useState } from 'react';
import { Folder, FolderOpen, FileCode, Upload, FilePlus, Trash2, Code } from 'lucide-react';
import { CodeFile } from '../types';

interface CodebaseExplorerProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onCodebaseUpdated: (newFiles: CodeFile[]) => void;
  onAddFile: (name: string, content?: string) => void;
  onDeleteFile: (id: string) => void;
}

export default function CodebaseExplorer({
  files,
  activeFileId,
  onSelectFile,
  onCodebaseUpdated,
  onAddFile,
  onDeleteFile,
}: CodebaseExplorerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to resolve languages
  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'javascript';
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    parseFileList(uploadedFiles);
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    parseFileList(uploadedFiles);
  };

  const parseFileList = (fileList: FileList | File[]) => {
    const parsedFiles: CodeFile[] = [];
    const promises = Array.from(fileList).map((file) => {
      // Only process text files under 2MB to keep browser snappy
      const isText = /\.(js|jsx|ts|tsx|py|css|html|json|md|txt|yml|yaml|ini|conf)$/i.test(file.name) || file.type.startsWith('text/');
      if (!isText || file.size > 2 * 1024 * 1024) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === 'string') {
            parsedFiles.push({
              id: 'file-' + Math.random().toString(36).substring(2, 9),
              name: file.name,
              path: (file as any).webkitRelativePath || file.name,
              content: event.target.result,
              language: getLanguageFromExtension(file.name),
            });
          }
          resolve();
        };
        reader.readAsText(file);
      });
    });

    Promise.all(promises).then(() => {
      if (parsedFiles.length > 0) {
        onCodebaseUpdated([...files, ...parsedFiles]);
      }
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseFileList(e.dataTransfer.files);
    }
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onAddFile(newFileName.trim());
    setNewFileName('');
    setShowAddForm(false);
  };

  // Group files into standard virtual directories
  const buildTree = () => {
    const directories: Record<string, CodeFile[]> = { '/': [] };

    files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/');
        if (!directories[dir]) {
          directories[dir] = [];
        }
        directories[dir].push(file);
      } else {
        directories['/'].push(file);
      }
    });

    return directories;
  };

  const tree = buildTree();

  return (
    <div
      className="flex flex-col h-full bg-[#161a22] border-r border-[#222733] text-slate-350 font-sans"
      id="codebase-explorer"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#222733] flex items-center justify-between bg-[#161a22]">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-indigo-400 animate-pulse" />
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">File Explorer</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 hover:bg-[#1f242f] hover:text-indigo-400 rounded text-slate-500 transition cursor-pointer"
            title="Create New File"
          >
            <FilePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add New File Form */}
      {showAddForm && (
        <form onSubmit={handleCreateFile} className="p-3 bg-[#11141a] border-b border-[#222733] flex gap-2">
          <input
            type="text"
            placeholder="filename.js..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs bg-[#161a22] border border-[#222733] rounded text-slate-200 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-indigo-600 text-slate-100 text-xs rounded font-medium hover:bg-indigo-500 transition cursor-pointer"
          >
            Create
          </button>
        </form>
      )}

      {/* Upload Actions & Drag and Drop Zone */}
      <div
        className={`p-4 border-b border-[#222733]/80 bg-[#11141a]/40 flex flex-col gap-2 transition ${
          isDragging ? 'bg-indigo-950/20 border-indigo-500 border-dashed border-2' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-[9px] text-slate-500 font-bold text-center uppercase tracking-wider mb-1">
          Ingest Project Codebase
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* HTML5 Webkit Directory Upload */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-2 bg-[#161a22] hover:bg-[#1f242f] border border-[#222733] rounded text-slate-350 text-[11px] font-medium transition cursor-pointer"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            <span>Folder</span>
          </button>
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderUpload}
            style={{ display: 'none' }}
            {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-2 bg-[#161a22] hover:bg-[#1f242f] border border-[#222733] rounded text-slate-350 text-[11px] font-medium transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" />
            <span>Files</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesUpload}
            multiple
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* File Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Object.entries(tree).map(([dir, dirFiles]) => {
          if (dirFiles.length === 0) return null;

          const isRoot = dir === '/';

          return (
            <div key={dir} className="space-y-1">
              {!isRoot && (
                <div className="flex items-center gap-1.5 px-2 py-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <Folder className="h-3 w-3 text-slate-600" />
                  <span className="truncate">{dir}</span>
                </div>
              )}
              <div className={isRoot ? '' : 'pl-3 border-l border-[#222733]/60 space-y-0.5'}>
                {dirFiles.map((file) => {
                  const isActive = file.id === activeFileId;
                  return (
                    <div
                      key={file.id}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded transition text-xs cursor-pointer ${
                        isActive
                          ? 'bg-indigo-500/10 text-indigo-400 font-medium border-l-2 border-indigo-500'
                          : 'hover:bg-[#1f242f]/55 text-slate-400 hover:text-slate-200'
                      }`}
                      onClick={() => onSelectFile(file.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(file.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 rounded transition cursor-pointer"
                        title="Delete File"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* VCS Timeline bottom panel from Geometric Balance specifications */}
      <div className="p-4 bg-[#11141a]/60 border-t border-[#222733]">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 font-mono">
          <span>VCS TIMELINE</span>
          <span className="text-indigo-400 font-semibold">v2.4.1</span>
        </div>
        <div className="flex h-12 gap-1 items-end pt-1">
          <div className="flex-1 h-6 bg-[#222733]/85 rounded-t-sm hover:bg-indigo-500 transition-all duration-300 cursor-pointer" title="Workspace Clean"></div>
          <div className="flex-1 h-8 bg-[#222733]/85 rounded-t-sm hover:bg-indigo-500 transition-all duration-300 cursor-pointer" title="Direct Code Sync"></div>
          <div className="flex-1 h-4 bg-[#222733]/85 rounded-t-sm hover:bg-indigo-500 transition-all duration-300 cursor-pointer" title="Local Snapshots"></div>
          <div className="flex-1 h-10 bg-indigo-500 rounded-t-sm animate-pulse cursor-pointer" title="AI Ingest Activity"></div>
          <div className="flex-1 h-2 bg-[#222733]/85 rounded-t-sm hover:bg-indigo-500 transition-all duration-300 cursor-pointer" title="Initial Import"></div>
          <div className="flex-1 h-5 bg-[#222733]/85 rounded-t-sm hover:bg-indigo-500 transition-all duration-300 cursor-pointer" title="Tunnel Diagnostic"></div>
          <div className="flex-1 h-3 bg-rose-500 rounded-t-sm cursor-pointer" title="Exception Cleared"></div>
        </div>
      </div>
    </div>
  );
}
