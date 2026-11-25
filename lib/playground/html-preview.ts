import type { SourceFile } from './workspace';

const MIME = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
} as const;

export function htmlPreviewFiles(files: SourceFile[], entry: string) {
  return files.flatMap((file) => {
    const ext = /\.([a-z]+)$/i.exec(file.name)?.[1].toLowerCase();
    if (!ext || !Object.hasOwn(MIME, ext) ||
        (file.name !== entry && file.name.split('/').some((part) => part.startsWith('.')))) return [];
    return [{ ...file, mime: MIME[ext as keyof typeof MIME] }];
  });
}

export function htmlPreviewPath(entry: string) {
  return '/' + entry.split('/').map((part) => encodeURIComponent(part)).join('/');
}

// The server is supplied by the application, not by the workspace. Only files in
// the manifest can be read, and none of the submitted JS executes in this process.
export const HTML_PREVIEW_SERVER = String.raw`
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const [port, entry, rawManifest] = process.argv.slice(2);
const manifest = new Map(JSON.parse(rawManifest));
const policy = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "media-src 'self' data:",
  "connect-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
  "sandbox allow-scripts allow-same-origin",
].join('; ');
createServer(async (request, response) => {
  response.setHeader('Content-Security-Policy', policy);
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {Allow: 'GET, HEAD'}).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const mime = manifest.get(path || entry);
  if (!mime) {
    response.writeHead(404).end();
    return;
  }
  if (!path) {
    const location = '/' + entry.split('/').map(encodeURIComponent).join('/');
    response.writeHead(302, {Location: location}).end();
    return;
  }
  try {
    const bytes = await readFile('workspace/' + path);
    response.writeHead(200, {'Content-Type': mime, 'Content-Length': bytes.length});
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(port), '0.0.0.0');
`;
