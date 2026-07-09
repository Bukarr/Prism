import { CodeFile } from '../types';

export const initialCodebase: CodeFile[] = [
  {
    id: 'file-1',
    name: 'index.js',
    path: 'src/index.js',
    content: `// OmniDebug AI Sample Codebase
// Try selecting this file and clicking 'Analyze Bugs' or 'Explain Logic'

function processUserData(jsonData) {
  console.log("Analyzing user raw payload...");
  
  // WARNING: potential security vulnerability and crash risk
  const user = eval("(" + jsonData + ")");
  
  if (user.age === NaN) {
    console.log("Age is not specified, setting default.");
    user.age = 18;
  }
  
  document.write("<p>Welcome back, " + user.name + "!</p>");
  return user;
}

const rawPayload = '{"name": "Alice", "age": null}';
processUserData(rawPayload);
`,
    language: 'javascript'
  },
  {
    id: 'file-2',
    name: 'dataFetcher.ts',
    path: 'src/services/dataFetcher.ts',
    content: `// Asynchronous data synchronization module
import { CodeFile } from '../types';

export async function syncLocalFiles(files: string[]) {
  console.log("Starting remote codebase synchronization...");
  const results: any[] = [];
  
  // WARNING: forEach does not await async operations, leading to unhandled parallel state
  files.forEach(async (file) => {
    const data = await mockFetchFileData(file);
    console.log(\`Successfully synced file: \${file}\`);
    results.push({ file, size: data.length });
  });
  
  console.log("Sync sequence triggered for all files.");
  return results;
}

function mockFetchFileData(filename: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(\`// Simulated code for \${filename}\\nconst val = 100;\`);
    }, 500);
  });
}
`,
    language: 'typescript'
  },
  {
    id: 'file-3',
    name: 'process_pipeline.py',
    path: 'scripts/process_pipeline.py',
    content: `import os
import sys

def run_pipeline(configs):
    print("Initializing Python processing pipeline...")
    
    # Buggy syntax and dictionary access
    for key in configs:
        if key == "timeout" and configs[key] == None:
            # Danger of throwing KeyError if we accessed it directly later
            configs["timeout"] = 30
            
    print("Running task on data chunk...")
    # Unhandled reference
    output = process_chunk(configs["data"])
    return output

def process_chunk(data):
    if not data:
        # Potential divide by zero risk
        return 100 / len(data)
    return len(data) * 2
`,
    language: 'python'
  }
];
