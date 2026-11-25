import { MAX_CODE_BYTES, MAX_REQUEST_BYTES } from './input';
import { MAX_FILES, MAX_FOLDERS, parseWorkspaceDraft } from './workspace';
import type { Session } from '@vercel/sandbox';
import { posix } from 'node:path';

// Run this inside the VM; never follow symlinks or include dependency and build trees.
const exportProgram = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const ignored = new Set(['node_modules', '.git', '.next', 'dist', '.cache', 'coverage', '__pycache__']);
const files = [], folders = [];
let bytes = 0;
function walk(dir, relative = '') {
  if (!fs.lstatSync(dir).isDirectory()) throw new Error('Invalid project directory.');
  for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    const name = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (folders.length >= ${MAX_FOLDERS} || name.split('/').length > 10) throw new Error('Workspace folder limit.');
      folders.push(name);
      walk(file,name);
    } else if (entry.isFile()) {
      const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
      try {
        const st = fs.fstatSync(fd);
        if (!st.isFile()) continue;
        if (files.length >= ${MAX_FILES} || bytes + st.size > ${MAX_CODE_BYTES}) throw new Error('Workspace file limit.');
        const data = Buffer.alloc(st.size + 1);
        const length = fs.readSync(fd,data);
        if (length !== st.size) throw new Error('File changed during sync.');
        const slice = data.subarray(0,length);
        if (slice.includes(0)) continue;
        let content;
        try { content = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(slice); }
        catch { continue; }
        bytes += length;
        files.push({name,content});
      } finally { fs.closeSync(fd); }
    }
  }
}
walk(process.argv[1]);
fs.writeFileSync(process.argv[2], JSON.stringify({files,folders,entry:files[0]?.name ?? ''}), {flag:'wx'});
`;

export async function snapshotLinux(sandbox: Session, root: string, id: string) {
  const path = posix.join(sandbox.cwd, `snapshot-${id}.json`);
  try {
    const cmd = await sandbox.runCommand({
      cmd: 'node', args: ['--input-type=commonjs', '-e', exportProgram, root, path],
      cwd: sandbox.cwd, timeoutMs: 5_000,
    });
    if (cmd.exitCode !== 0) throw new Error('Project exceeds the workspace limits or a file changed. Retry after saving.');
    const stream = await sandbox.readFile({ path }, { signal: AbortSignal.timeout(8_000) });
    if (!stream) throw new Error('Missing project snapshot.');
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const value of stream) {
      const chunk = Buffer.from(value);
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BYTES) throw new Error('Project snapshot exceeds the workspace limit.');
      chunks.push(chunk);
    }
    const workspace = parseWorkspaceDraft(JSON.parse(Buffer.concat(chunks).toString('utf8')), MAX_CODE_BYTES);
    if (!workspace) throw new Error('Project contains unsupported file names or exceeds the workspace limit.');
    return workspace;
  } finally {
    await sandbox.runCommand({ cmd: 'rm', args: ['-f', '--', path], cwd: sandbox.cwd, timeoutMs: 3_000 }).catch(() => {});
  }
}
