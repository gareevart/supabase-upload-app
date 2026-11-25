import { MAX_TERMINAL_BYTES } from './terminal';
import { MAX_FILES, MAX_FOLDERS } from './workspace';

// This program runs in the VM. No local server filesystem access. Never follow symlinks,
// export install artifacts, or print arbitrary unbounded data from a package.
export const TERMINAL_EXPORT = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const [kind, folder] = process.argv.slice(1);
const files = [], folders = [];
let bytes = 0;
const ignored = new Set(['node_modules', '.git', '.npm', '.cache', '.npmrc']);
function add(name) {
  const fd = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const info = fs.fstatSync(fd);
    if (!info.isFile()) return;
    if (files.length >= ${MAX_FILES} || bytes + info.size > ${MAX_TERMINAL_BYTES}) throw new Error('Project exceeds the Workspace limit.');
    const buffer = Buffer.alloc(info.size + 1);
    const length = fs.readSync(fd, buffer);
    if (length !== info.size) throw new Error('Project file changed while reading it.');
    const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length));
    bytes += length;
    files.push({ name, content });
  } finally { fs.closeSync(fd); }
}
function walk(dir) {
  if (!fs.lstatSync(dir).isDirectory() || folders.length >= ${MAX_FOLDERS}) throw new Error('Invalid project folder.');
  folders.push(dir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) add(file);
  }
}
if (kind === 'create') walk(folder);
else for (const file of ['package.json', 'package-lock.json']) {
  if (fs.lstatSync(file, {throwIfNoEntry: false})?.isFile()) add(file);
}
fs.writeFileSync("../terminal-result.json", JSON.stringify({ files, folders }), { flag: "wx" });
`;
