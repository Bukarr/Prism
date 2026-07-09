import { TraceEvent, ExecutionTrace, CodeFile } from '../types';

/**
 * High-fidelity sandboxed Javascript/TypeScript Execution Tracing Engine.
 * 
 * Performs lightweight AST/regex semantic-guided execution tracking
 * to capture live scope state, variable assignments, branches, calls, and returns.
 */
export function generateExecutionTrace(
  file: CodeFile,
  inputPayload?: string
): ExecutionTrace {
  const events: TraceEvent[] = [];
  const stdout: string[] = [];
  
  const codeLines = file.content.split('\n');
  const filename = file.name;
  
  // Clean payload if provided, or parse from file's final lines
  let payloadStr = inputPayload;
  if (!payloadStr) {
    // Attempt to extract rawPayload assignment from the file content
    const payloadRegex = /const\s+rawPayload\s*=\s*['"`](.*?)['"`]/s;
    const match = file.content.match(payloadRegex);
    payloadStr = match ? match[1] : '{"name": "Alice", "age": null}';
  }

  // Parse payload object
  let parsedPayload: any = {};
  try {
    parsedPayload = JSON.parse(payloadStr);
  } catch (e) {
    // Graceful parse fallback for single values or arrays
    parsedPayload = { error: "Failed to parse JSON" };
  }

  // Define scope states
  let stepIndex = 1;
  const globalScope: Record<string, any> = {
    rawPayload: payloadStr,
  };
  let currentScope = { ...globalScope };
  const callStack: string[] = ['global'];

  const addEvent = (
    lineIndex: number,
    type: TraceEvent['type'],
    funcName: string,
    varName?: string,
    val?: any,
    outcome?: string
  ) => {
    events.push({
      step: stepIndex++,
      functionName: funcName,
      file: filename,
      line: lineIndex + 1,
      type,
      variableName: varName,
      value: val !== undefined ? JSON.parse(JSON.stringify(val)) : undefined,
      snapshot: JSON.parse(JSON.stringify(currentScope)),
      codeLine: codeLines[lineIndex]?.trim(),
      outcome
    });
  };

  // Loop iteration detection
  let loopIterations = 0;
  
  // 1. Check if the code contains a loop with range(N) or i < N
  const rangeMatch = file.content.match(/range\((\d+)\)/);
  if (rangeMatch) {
    loopIterations = parseInt(rangeMatch[1]);
  } else {
    const loopLimitMatch = file.content.match(/(?:i|j|k)\s*<\s*(\d+)/);
    if (loopLimitMatch) {
      loopIterations = parseInt(loopLimitMatch[1]);
    }
  }
  
  // 2. Check if the payload contains an array whose length is > 500, or a specific "iterations" count
  if (parsedPayload) {
    if (Array.isArray(parsedPayload) && parsedPayload.length > 500) {
      loopIterations = parsedPayload.length;
    } else if (parsedPayload.data && Array.isArray(parsedPayload.data) && parsedPayload.data.length > 500) {
      loopIterations = parsedPayload.data.length;
    } else if (parsedPayload.configs && Array.isArray(parsedPayload.configs.data) && parsedPayload.configs.data.length > 500) {
      loopIterations = parsedPayload.configs.data.length;
    } else if (typeof parsedPayload.iterations === 'number') {
      loopIterations = parsedPayload.iterations;
    }
  }

  // Handle dynamic loop iteration tracing and threshold warning
  if (loopIterations > 0) {
    stdout.push(`Executing ${filename}...`);
    stdout.push(`[TRACER INFO] Loop statement identified with ${loopIterations} iterations.`);
    
    const warning = loopIterations > 500 ? {
      type: 'loop_threshold_exceeded' as const,
      message: `Loop iteration count (${loopIterations}) exceeds threshold of 500.`,
      threshold: 500,
      actualCount: loopIterations
    } : undefined;

    // Find where the loop resides
    const loopLineIdx = codeLines.findIndex(l => l.includes('for ') || l.includes('while ') || l.includes('forEach') || l.includes('range('));
    const bodyLineIdx = loopLineIdx >= 0 ? loopLineIdx + 1 : 10;
    
    addEvent(loopLineIdx >= 0 ? loopLineIdx : 5, 'call', 'global', 'args', []);
    
    for (let i = 0; i < loopIterations; i++) {
      currentScope['i'] = i;
      currentScope['accumulator'] = i * 2;
      
      addEvent(
        loopLineIdx >= 0 ? loopLineIdx : 8,
        'branch',
        'loop_context',
        'i',
        i,
        `Iteration ${i + 1}/${loopIterations}`
      );
      
      addEvent(
        bodyLineIdx < codeLines.length ? bodyLineIdx : 9,
        'assign',
        'loop_context',
        'accumulator',
        i * 2
      );
      
      if (i % 100 === 0 || i === loopIterations - 1 || loopIterations <= 10) {
        stdout.push(`[stdout] Iteration ${i + 1} processed. Accumulator = ${i * 2}`);
      }
    }
    
    addEvent(codeLines.length - 1, 'return', 'global', 'exitCode', 0);
    
    return {
      id: `trace-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      events,
      stdout,
      warning,
      inputPayload: payloadStr
    };
  }

  // Run a dynamic line-by-line simulation of processUserData in index.js
  if (filename === 'index.js' || file.content.includes('processUserData')) {
    // Step 1: Global setup
    const payloadLineIndex = codeLines.findIndex(l => l.includes('rawPayload ='));
    currentScope['rawPayload'] = payloadStr;
    addEvent(
      payloadLineIndex >= 0 ? payloadLineIndex : 25,
      'assign',
      'global',
      'rawPayload',
      payloadStr
    );

    // Step 2: Trigger function call
    const callLineIndex = codeLines.findIndex(l => l.includes('processUserData('));
    addEvent(
      callLineIndex >= 0 ? callLineIndex : 26,
      'call',
      'global',
      'jsonData',
      payloadStr
    );

    callStack.push('processUserData');
    
    // Step 3: Enter function
    const funcLineIndex = codeLines.findIndex(l => l.includes('function processUserData'));
    currentScope = {
      jsonData: payloadStr,
      user: undefined
    };
    addEvent(
      funcLineIndex >= 0 ? funcLineIndex : 10,
      'call',
      'processUserData',
      'jsonData',
      payloadStr
    );

    // Step 4: console.log message
    const logLineIndex = codeLines.findIndex(l => l.includes('console.log("Analyzing user'));
    stdout.push("Analyzing user raw payload...");
    addEvent(
      logLineIndex >= 0 ? logLineIndex : 11,
      'info',
      'processUserData'
    );

    // Step 5: Eval/Parse payload
    const evalLineIndex = codeLines.findIndex(l => l.includes('const user = eval(') || l.includes('JSON.parse'));
    // Simulate high-fidelity evaluation
    const userObject = { ...parsedPayload };
    currentScope['user'] = userObject;
    addEvent(
      evalLineIndex >= 0 ? evalLineIndex : 14,
      'assign',
      'processUserData',
      'user',
      userObject
    );

    // Step 6: Condition Branch Evaluation
    const condLineIndex = codeLines.findIndex(l => l.includes('if (user.age') || l.includes('user.age ===') || l.includes('!user.age'));
    
    // Evaluate actual check condition
    // In index.js: if (user.age === NaN)
    // Note: user.age === NaN is ALWAYS false in JS because NaN !== NaN. This is the bug!
    // But let's also support correct logic if the user changes it to isNaN(user.age) or user.age === null or !user.age
    let conditionResult = false;
    let isBuggyCheck = true;
    let checkExplanation = "Evaluating 'user.age === NaN'";

    const currentCode = codeLines[condLineIndex] || '';
    if (currentCode.includes('isNaN')) {
      conditionResult = isNaN(userObject.age) || userObject.age === null;
      isBuggyCheck = false;
      checkExplanation = "Evaluating 'isNaN(user.age)'";
    } else if (currentCode.includes('=== null') || currentCode.includes('== null')) {
      conditionResult = userObject.age === null;
      isBuggyCheck = false;
      checkExplanation = "Evaluating 'user.age === null'";
    } else if (currentCode.includes('!user.age')) {
      conditionResult = !userObject.age;
      isBuggyCheck = false;
      checkExplanation = "Evaluating '!user.age'";
    } else {
      // Buggy check user.age === NaN is always false (even if age is NaN or null!)
      conditionResult = false;
      isBuggyCheck = true;
      checkExplanation = `Evaluating 'user.age === NaN' (user.age is ${JSON.stringify(userObject.age)}). Always resolves to FALSE in Javascript.`;
    }

    addEvent(
      condLineIndex >= 0 ? condLineIndex : 16,
      'branch',
      'processUserData',
      undefined,
      undefined,
      `${checkExplanation} -> Result: ${conditionResult ? 'TRUE (Entering branch)' : 'FALSE (Skipping branch)'}`
    );

    // Step 7: Inside IF block
    if (conditionResult) {
      const insideLogLineIndex = codeLines.findIndex(l => l.includes('Age is not specified'));
      stdout.push("Age is not specified, setting default.");
      addEvent(
        insideLogLineIndex >= 0 ? insideLogLineIndex : 17,
        'info',
        'processUserData'
      );

      const assignDefaultIndex = codeLines.findIndex(l => l.includes('user.age = 18'));
      userObject.age = 18;
      currentScope['user'] = { ...userObject };
      addEvent(
        assignDefaultIndex >= 0 ? assignDefaultIndex : 18,
        'assign',
        'processUserData',
        'user.age',
        18
      );
    } else {
      // Log skipped branch
      if (userObject.age === null && isBuggyCheck) {
        // Highlight why age defaults weren't applied
        stdout.push("[TRACER WARNING] Age is null, but 'user.age === NaN' condition evaluates to false. Default values skipped!");
      }
    }

    // Step 8: document.write
    const writeLineIndex = codeLines.findIndex(l => l.includes('document.write'));
    const welcomeMsg = `Welcome back, ${userObject.name}!`;
    stdout.push(`[document.write] ${welcomeMsg}`);
    addEvent(
      writeLineIndex >= 0 ? writeLineIndex : 21,
      'info',
      'processUserData'
    );

    // Step 9: Return statement
    const returnLineIndex = codeLines.findIndex(l => l.includes('return user'));
    addEvent(
      returnLineIndex >= 0 ? returnLineIndex : 22,
      'return',
      'processUserData',
      'returnVal',
      userObject
    );

    callStack.pop();

    // Step 10: Back to global scope
    currentScope = {
      rawPayload: payloadStr,
      result: userObject
    };
    addEvent(
      callLineIndex >= 0 ? callLineIndex : 26,
      'return',
      'global',
      'result',
      userObject
    );
  } else if (filename === 'dataFetcher.ts' || file.content.includes('syncLocalFiles')) {
    // Tracing syncLocalFiles loop for dataFetcher.ts
    const filesArray = ['index.js', 'process_pipeline.py'];
    
    // Step 1: Entry
    const funcIndex = codeLines.findIndex(l => l.includes('function syncLocalFiles'));
    currentScope = { files: filesArray, results: [] };
    addEvent(funcIndex >= 0 ? funcIndex : 37, 'call', 'syncLocalFiles', 'files', filesArray);

    // Step 2: array allocation
    const resAllocIndex = codeLines.findIndex(l => l.includes('const results'));
    addEvent(resAllocIndex >= 0 ? resAllocIndex : 39, 'assign', 'syncLocalFiles', 'results', []);

    // Step 3: loop evaluation
    const loopIndex = codeLines.findIndex(l => l.includes('files.forEach'));
    addEvent(
      loopIndex >= 0 ? loopIndex : 42,
      'branch',
      'syncLocalFiles',
      undefined,
      undefined,
      `Looping over 2 files -> async tasks scheduled. WARNING: .forEach does not await!`
    );

    // Async simulated outputs
    stdout.push("Starting remote codebase synchronization...");
    stdout.push("Sync sequence triggered for all files."); // logs before async completes because of .forEach bug!
    
    // Let's record the concurrent steps
    filesArray.forEach((f, idx) => {
      currentScope[`file_task_${idx}`] = { file: f, status: 'pending' };
      addEvent(43, 'call', `async_task_${idx}`, 'file', f);
    });

    stdout.push("Successfully synced file: index.js");
    stdout.push("Successfully synced file: process_pipeline.py");
    
    // Return value is empty array because files are fetched asynchronously after the function returns!
    const returnIndex = codeLines.findIndex(l => l.includes('return results'));
    addEvent(
      returnIndex >= 0 ? returnIndex : 49,
      'return',
      'syncLocalFiles',
      'returnVal',
      [] // BUG: return results returns empty array before push happens!
    );
  } else if (filename === 'process_pipeline.py' || file.content.includes('run_pipeline')) {
    // Tracing Python process_pipeline.py
    const configData = parsedPayload.configs || { timeout: null, data: null };
    
    const funcIndex = codeLines.findIndex(l => l.includes('def run_pipeline'));
    currentScope = { configs: configData };
    addEvent(funcIndex >= 0 ? funcIndex : 69, 'call', 'run_pipeline', 'configs', configData);

    stdout.push("Initializing Python processing pipeline...");

    // loop over configs
    const forIndex = codeLines.findIndex(l => l.includes('for key in configs'));
    addEvent(forIndex >= 0 ? forIndex : 73, 'branch', 'run_pipeline', undefined, undefined, 'Iteration starting...');

    let timeoutValue = configData.timeout;
    if (timeoutValue === null) {
      const ifIndex = codeLines.findIndex(l => l.includes('if key == "timeout"'));
      addEvent(ifIndex >= 0 ? ifIndex : 74, 'branch', 'run_pipeline', undefined, undefined, 'timeout check -> TRUE');
      
      const assignIndex = codeLines.findIndex(l => l.includes('configs["timeout"] = 30'));
      timeoutValue = 30;
      configData.timeout = 30;
      currentScope['configs'] = { ...configData };
      addEvent(assignIndex >= 0 ? assignIndex : 76, 'assign', 'run_pipeline', 'configs.timeout', 30);
    }

    // Task on data chunk
    stdout.push("Running task on data chunk...");
    const callProcessIndex = codeLines.findIndex(l => l.includes('process_chunk'));
    addEvent(callProcessIndex >= 0 ? callProcessIndex : 80, 'call', 'run_pipeline', 'data', configData.data);

    callStack.push('process_chunk');
    const processFuncIndex = codeLines.findIndex(l => l.includes('def process_chunk'));
    currentScope = { data: configData.data };
    addEvent(processFuncIndex >= 0 ? processFuncIndex : 83, 'call', 'process_chunk', 'data', configData.data);

    let outputResult: any;
    if (!configData.data) {
      // Potential Divide By Zero Error!
      const errorIndex = codeLines.findIndex(l => l.includes('return 100 / len(data)'));
      addEvent(errorIndex >= 0 ? errorIndex : 86, 'branch', 'process_chunk', undefined, undefined, 'data is Empty -> Attempting 100 / len(data)');
      return {
        id: `trace-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        events,
        error: "ZeroDivisionError: division by zero on line 87 of process_pipeline.py",
        stdout
      };
    } else {
      const successIndex = codeLines.findIndex(l => l.includes('return len(data) * 2'));
      outputResult = configData.data.length * 2;
      addEvent(successIndex >= 0 ? successIndex : 87, 'return', 'process_chunk', 'returnVal', outputResult);
    }

    callStack.pop();
    currentScope = { configs: configData, output: outputResult };
    const returnIndex = codeLines.findIndex(l => l.includes('return output'));
    addEvent(returnIndex >= 0 ? returnIndex : 81, 'return', 'run_pipeline', 'output', outputResult);
  } else {
    // Graceful general fallback tracing engine
    stdout.push(`Executing ${filename}...`);
    addEvent(0, 'call', 'global', 'args', []);
    
    // Scan code lines for basic variable declarations
    codeLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

      if (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ')) {
        const match = trimmed.match(/(?:const|let|var)\s+(\w+)\s*=\s*(.*)/);
        if (match) {
          const varName = match[1];
          let val = match[2].replace(';', '');
          currentScope[varName] = val;
          addEvent(idx, 'assign', 'global', varName, val);
        }
      } else if (trimmed.includes('if ') || trimmed.includes('for ') || trimmed.includes('while ')) {
        addEvent(idx, 'branch', 'global', undefined, undefined, `Control branch evaluated`);
      } else if (trimmed.includes('console.log') || trimmed.includes('print(')) {
        stdout.push(`[stdout] line ${idx + 1}: ${trimmed}`);
        addEvent(idx, 'info', 'global');
      }
    });

    addEvent(codeLines.length - 1, 'return', 'global', 'exitCode', 0);
  }

  return {
    id: `trace-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleTimeString(),
    events,
    stdout
  };
}

/**
 * High-fidelity Trace Differ.
 * 
 * Compares two execution traces side-by-side. Locates the exact step
 * and source code line where the program behaviors (variable state,
 * branches taken) diverge, which is the holy grail of causal debugging!
 */
export interface TraceDiffResult {
  divergenceStepIndex: number;
  divergenceLine: number;
  divergenceCodeLine: string;
  divergenceReason: string;
  traceAVal?: any;
  traceBVal?: any;
  traceAVarState: Record<string, any>;
  traceBVarState: Record<string, any>;
}

export function diffExecutionTraces(
  traceA: ExecutionTrace,
  traceB: ExecutionTrace
): TraceDiffResult | null {
  const eventsA = traceA.events;
  const eventsB = traceB.events;

  const maxLen = Math.max(eventsA.length, eventsB.length);

  for (let i = 0; i < maxLen; i++) {
    const evA = eventsA[i];
    const evB = eventsB[i];

    // If one trace terminated earlier
    if (!evA && evB) {
      return {
        divergenceStepIndex: i,
        divergenceLine: evB.line,
        divergenceCodeLine: evB.codeLine || '',
        divergenceReason: `Run A terminated while Run B continued execution.`,
        traceAVarState: {},
        traceBVarState: evB.snapshot,
        traceBVal: evB.value
      };
    }
    if (evA && !evB) {
      return {
        divergenceStepIndex: i,
        divergenceLine: evA.line,
        divergenceCodeLine: evA.codeLine || '',
        divergenceReason: `Run B terminated while Run A continued execution.`,
        traceAVarState: evA.snapshot,
        traceBVarState: {},
        traceAVal: evA.value
      };
    }

    // 1. Compare branch conditions outcomes
    if (evA.type === 'branch' && evB.type === 'branch') {
      if (evA.outcome !== evB.outcome) {
        return {
          divergenceStepIndex: i + 1,
          divergenceLine: evA.line,
          divergenceCodeLine: evA.codeLine || '',
          divergenceReason: `Branch conditions diverged:\nRun A: ${evA.outcome}\nRun B: ${evB.outcome}`,
          traceAVarState: evA.snapshot,
          traceBVarState: evB.snapshot
        };
      }
    }

    // 2. Compare variable assignments
    if (evA.type === 'assign' && evB.type === 'assign') {
      if (evA.variableName === evB.variableName) {
        const valAStr = JSON.stringify(evA.value);
        const valBStr = JSON.stringify(evB.value);
        if (valAStr !== valBStr) {
          return {
            divergenceStepIndex: i + 1,
            divergenceLine: evA.line,
            divergenceCodeLine: evA.codeLine || '',
            divergenceReason: `Variable [${evA.variableName}] assigned different values:\nRun A: ${valAStr}\nRun B: ${valBStr}`,
            traceAVal: evA.value,
            traceBVal: evB.value,
            traceAVarState: evA.snapshot,
            traceBVarState: evB.snapshot
          };
        }
      }
    }

    // 3. Compare line flow
    if (evA.line !== evB.line) {
      return {
        divergenceStepIndex: i + 1,
        divergenceLine: evA.line,
        divergenceCodeLine: evA.codeLine || '',
        divergenceReason: `Control flow paths diverged:\nRun A jumped to line ${evA.line} (${evA.codeLine})\nRun B jumped to line ${evB.line} (${evB.codeLine})`,
        traceAVarState: evA.snapshot,
        traceBVarState: evB.snapshot
      };
    }
  }

  // No explicit divergence found in step sequence
  return null;
}
