/* Runs only in the opaque CodeLab iframe's disposable worker. */
self.onmessage = async ({ data }) => {
  const { language, code, stdin, assets } = data;
  const send = self.postMessage.bind(self);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const streams = { stdout: '', stderr: '' };
  const sizes = { stdout: 0, stderr: 0 };
  let truncated = false;
  const write = (stream, text) => {
    const bytes = encoder.encode(String(text));
    const remaining = 65536 - sizes[stream];
    streams[stream] += decoder.decode(bytes.subarray(0, remaining), { stream: true });
    sizes[stream] += Math.min(bytes.length, remaining);
    if (bytes.length > remaining) { truncated = true; throw Error('Output exceeded 64 KB.'); }
  };
  let started;
  try {
    if (typeof code !== 'string' || typeof stdin !== 'string' || encoder.encode(code).length > 65536) throw Error('Source code exceeds 64 KB or is invalid.');
    let python, SQL;
    if (language === 'python') {
      importScripts(assets + 'pyodide-314.0.7/pyodide.js');
      python = await loadPyodide({ indexURL: assets + 'pyodide-314.0.7/' });
      const input = stdin.split('\n');
      if (input.at(-1) === '') input.pop();
      python.setStdin({ stdin: () => input.length ? input.shift() : null });
      python.setStdout({ batched: text => write('stdout', text + '\n') });
      python.setStderr({ batched: text => write('stderr', text + '\n') });
    } else if (language === 'sql') {
      importScripts(assets + 'sql.js-1.15.2/sql-wasm.js');
      SQL = await initSqlJs({ locateFile: file => assets + 'sql.js-1.15.2/' + file });
    } else if (language !== 'javascript') {
      throw Error('This language requires Run on server.');
    }
    send({ type: 'executing' });
    started = performance.now();
    if (python) {
      await python.runPythonAsync(code);
    } else if (SQL) {
      const db = new SQL.Database();
      try {
        for (const result of db.exec(code)) {
          for (const row of result.values) write('stdout', row.map(value => value == null ? '' : value).join('|') + '\n');
        }
      } finally { db.close(); }
    } else {
      const format = value => typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : String(value);
      const console = Object.fromEntries(['log', 'info', 'debug', 'warn', 'error'].map(method => [method,
        (...args) => write(method === 'error' || method === 'warn' ? 'stderr' : 'stdout', args.map(format).join(' ') + '\n')]));
      const require = name => {
        if (name !== 'fs' && name !== 'node:fs') throw Error('This Node.js module is unavailable in browser practice. Choose Run on server.');
        return { readFileSync(fd, encoding) {
          if (fd !== 0 || (encoding && !['utf8', 'utf-8'].includes(encoding))) throw Error('Only fs.readFileSync(0, "utf8") is supported. Choose Run on server.');
          return stdin;
        } };
      };
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      await new AsyncFunction('console', 'require', code)(console, require);
    }
    send({ type: 'result', result: { ...streams, compile_output: null,
      time: String((performance.now() - started) / 1000), memory: 0,
      status: { id: 3, description: 'Practice execution finished' } } });
  } catch (error) {
    const message = String(error?.message || error);
    send({ type: 'result', result: { ...streams,
      stderr: (streams.stderr + '\n' + message + (truncated ? '' : '\nIf this uses unsupported packages or Node.js features, choose Run on server.')).slice(0, 16000),
      compile_output: null, time: started ? String((performance.now() - started) / 1000) : '0', memory: 0,
      status: { id: 11, description: 'Practice execution error' } } });
  }
};
