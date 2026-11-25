import type { Sandbox } from '@vercel/sandbox';
import { posix } from 'node:path';
import type { LinuxChange } from './linux-workspace-sync';

const PATCH = String.raw`
const f = require('node:fs'), p = require('node:path'), crypto = require('node:crypto');
const [root, payload] = process.argv.slice(1);
const changes = JSON.parse(f.readFileSync(payload, 'utf8'));
const foldersCreating = new Set(changes.filter(x=>x.kind==='folder' && x.create).map(x=>x.path));
const removing = new Set(changes.filter(x=>x.kind==='folder' ? !x.create : x.after===null).map(x=>x.path));
const depth = x=>x.path.split('/').length;
const pathFor = x=>p.join(root,x.path);
const stat = x=>f.lstatSync(x,{throwIfNoEntry:false});
const conflict = () => process.exit(73);
const read = (path) => {
  const fd = f.openSync(path,f.constants.O_RDONLY|f.constants.O_NOFOLLOW|f.constants.O_NONBLOCK);
  try {
    const info=f.fstatSync(fd);
    if (!info.isFile() || info.size > 1280*1024) conflict();
    const data = Buffer.alloc(info.size + 1);
    const length = f.readSync(fd, data);
    if (length !== info.size) conflict();
    return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(data.subarray(0,length));
  } finally { f.closeSync(fd); }
};
if (!stat(root)?.isDirectory()) conflict();
const pending=[];
for (const x of changes) {
  const parts=x.path.split('/');
  for(let i=1;i<parts.length;i++){
    const prefix=parts.slice(0,i).join('/');
    const status=stat(p.join(root,prefix));
    if (status && !status.isDirectory()) conflict();
    if (!status && !foldersCreating.has(prefix) && (x.kind==='folder'?x.create:x.after!==null)) conflict();
  }
  const full=pathFor(x), old=stat(full);
  if(x.kind==='folder'){
    if(old && !old.isDirectory()) conflict();
    if(x.create===Boolean(old)) continue;
    if(old && f.readdirSync(full).some(name=>!removing.has(x.path+'/'+name))) conflict();
  } else {
    if(old && !old.isFile()) conflict();
    const contents=old ? read(full) : null;
    if(contents===x.after) continue;
    if(contents!==x.before) conflict();
  }
  pending.push(x);
}
for(const x of pending.filter(x=>x.kind==='folder'&&x.create).sort((a,b)=>depth(a)-depth(b))) f.mkdirSync(pathFor(x));
for(const x of pending.filter(x=>x.kind==='file'&&x.after!==null)){
  const full=pathFor(x), before=stat(full);
  if((before ? read(full):null)!==x.before) conflict();
  const temp=p.join(p.dirname(full),'.playground-write-'+crypto.randomUUID());
  try {
    f.writeFileSync(temp,x.after,{flag:'wx',mode:before ? before.mode & 0o777 : 0o644});
    f.renameSync(temp,full);
  } finally { f.rmSync(temp,{force:true}); }
}
for(const x of pending.filter(x=>x.kind==='file'&&x.after===null)){
  const full=pathFor(x);
  if(!stat(full) || read(full)!==x.before) conflict();
  f.unlinkSync(full);
}
for(const x of pending.filter(x=>x.kind==='folder'&&!x.create).sort((a,b)=>depth(b)-depth(a))) f.rmdirSync(pathFor(x));
`;

export async function applyLinuxChanges(sandbox: Sandbox, root: string, id: string, changes: LinuxChange[]) {
  const session = sandbox.currentSession();
  const path = posix.join(session.cwd, `patch-${id}.json`);
  try {
    await session.writeFiles([{ path, content: Buffer.from(JSON.stringify(changes)) }], { signal: AbortSignal.timeout(7_000) });
    const cmd = await session.runCommand({
      cmd: 'node', args: ['--input-type=commonjs', '-e', PATCH, root, path], cwd: session.cwd, timeoutMs: 5_000,
    });
    if (cmd.exitCode === 73) return false;
    if (cmd.exitCode !== 0) throw new Error('Could not write workspace files.');
    return true;
  } finally {
    await session.runCommand({ cmd: 'rm', args: ['-f', '--', path], cwd: session.cwd, timeoutMs: 3_000 }).catch(() => {});
  }
}
