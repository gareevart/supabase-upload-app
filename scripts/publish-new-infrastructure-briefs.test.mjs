import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const publisher = resolve(process.env.PUBLISHER_UNDER_TEST || 'scripts/publish-new-infrastructure-briefs.mjs');
async function run(scenario) {
  const dir = await mkdtemp(join(tmpdir(), 'brief-cover-'));
  try {
    const git = (...args) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init'); git('commit', '--allow-empty', '-m', 'before');
    const before = git('rev-parse', 'HEAD');
    await mkdir(join(dir, 'content/briefs'), { recursive: true });
    const stem = 'content/briefs/2026-11-27-infrastructure-design-brief';
    await writeFile(join(dir, stem + '.md'), '# Infrastructure Design Brief — November 21–27, 2026\n\nIntro.\n\n[Source](https://example.com)\n');
    await writeFile(join(dir, stem + '.cover.json'), JSON.stringify({
      excerpt: 'Clear controls for developer tools.',
      prompt: 'Illustrate: Clear controls for developer tools.',
      image: scenario === 'traversal' ? '../secret.png' : '2026-11-27-infrastructure-design-brief.cover.png',
    }));
    await writeFile(join(dir, stem + '.cover.png'), scenario === 'invalid-image' ? Buffer.from('not an image') : Buffer.from([137,80,78,71,13,10,26,10,0]));
    git('add', '.'); git('commit', '-m', 'brief');
    const after = git('rev-parse', 'HEAD');
    const mock = `
      import assert from 'node:assert/strict';
      const scenario = process.env.TEST_SCENARIO;
      let writes = 0;
      globalThis.fetch = async (url, options = {}) => {
        const method = options.method || 'GET';
        if (String(url).includes('api/storage/file')) {
          return new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } });
        }
        if (method === 'GET') {
          return Response.json(scenario === 'update' || scenario === 'existing' ? [{
            id: 'existing-id', slug: 'infrastructure-design-brief-2026-11-27', published: true,
            featured_image: scenario === 'existing' ? '/api/storage/file?path=featured/old.png' : null,
          }] : []);
        }
        writes++;
        assert.equal(method, scenario === 'create' ? 'POST' : 'PUT');
        if (scenario !== 'create') assert.ok(String(url).endsWith('/existing-id'));
        const body = JSON.parse(options.body);
        assert.equal(body.excerpt, 'Clear controls for developer tools.');
        assert.equal(body.show_featured_image, true);
        assert.equal(body.published, true);
        assert.ok(body.featured_image.startsWith('data:image/png;base64,'));
        assert.equal(body.slug, 'infrastructure-design-brief-2026-11-27');
        return Response.json({ ...body, id: 'existing-id', featured_image: '/api/storage/file?path=featured/test/cover.png' });
      };
      process.on('exit', (code) => {
        if (code === 0) assert.equal(writes, 1);
      });
    `;
    await writeFile(join(dir, 'mock.mjs'), mock);
    return spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), publisher], {
      cwd: dir, encoding: 'utf8',
      env: { ...process.env, GAREEV_BLOG_API_KEY: 'sk_' + 'a'.repeat(64), BEFORE_SHA: before, AFTER_SHA: after, TEST_SCENARIO: scenario },
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
}
for (const scenario of ['create', 'update', 'existing']) {
  test(scenario + ': publishes or refreshes a cover', async () => {
    const result = await run(scenario);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes('sk_' + 'a'.repeat(64)));
  });
}
for (const scenario of ['invalid-image', 'traversal']) {
  test(scenario + ': rejects invalid cover input', async () => {
    const result = await run(scenario);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /valid image|valid cover metadata/);
  });
}
