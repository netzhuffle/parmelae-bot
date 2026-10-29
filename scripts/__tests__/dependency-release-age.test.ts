import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repository = join(import.meta.dir, '../..');

test('Bun enforces release age, scopes exceptions to one version, and replays frozen locks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-age-'));
  const policy = await Bun.file(join(repository, 'bunfig.toml')).text();
  const pin = (await Bun.file(join(repository, '.bun-version')).text()).trim();
  expect(Bun.version).toBe(pin);
  const name = 'release-age-fixture';
  const versions = ['1.0.0', '1.0.1', '1.0.2'];
  const now = Date.now();
  const published = [now - 4 * 86400_000, now - 2 * 86400_000, now - 3600_000];
  const archives = new Map<string, Uint8Array>();
  const home = join(root, 'home');
  await mkdir(home);
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: home,
    XDG_CONFIG_HOME: home,
    NPM_CONFIG_USERCONFIG: join(home, '.npmrc'),
    BUN_INSTALL_CACHE_DIR: join(root, 'cache'),
  };
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request): Response {
      if (request.headers.has('authorization'))
        return new Response('No credentials allowed', { status: 400 });
      const path = new URL(request.url).pathname;
      if (path === `/${name}`) {
        return Response.json({
          name,
          'dist-tags': { latest: '1.0.2' },
          time: Object.fromEntries(
            versions.map((version, i) => [version, new Date(published[i]).toISOString()]),
          ),
          versions: Object.fromEntries(
            versions.map((version) => [
              version,
              {
                name,
                version,
                dist: { tarball: `${server.url.href}${name}-${version}.tgz` },
              },
            ]),
          ),
        });
      }
      const archive = archives.get(path.slice(1));
      return archive ? new Response(archive) : new Response('Not found', { status: 404 });
    },
  });
  async function install(directory: string, frozen = false) {
    const child = Bun.spawn(
      [process.execPath, 'install', '--no-env-file', ...(frozen ? ['--frozen-lockfile'] : [])],
      {
        cwd: directory,
        env,
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ code, output: stdout + stderr }).toEqual({ code: 0, output: expect.any(String) });
  }
  async function project(label: string, config: string) {
    const directory = join(root, label);
    await mkdir(directory);
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ dependencies: { [name]: '^1.0.0' } }),
    );
    await writeFile(join(directory, 'bunfig.toml'), `${config}\nregistry = "${server.url.href}"\n`);
    return directory;
  }
  async function installed(directory: string) {
    return (await Bun.file(join(directory, 'node_modules', name, 'package.json')).json()).version;
  }
  try {
    for (const version of versions) {
      const source = join(root, version);
      await mkdir(join(source, 'package'), { recursive: true });
      await writeFile(join(source, 'package/package.json'), JSON.stringify({ name, version }));
      const archive = join(root, `${name}-${version}.tgz`);
      const tar = Bun.spawn(['tar', '-czf', archive, '-C', source, 'package'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(await tar.exited).toBe(0);
      archives.set(`${name}-${version}.tgz`, new Uint8Array(await Bun.file(archive).arrayBuffer()));
    }
    const normal = await project('normal', policy);
    await install(normal);
    expect(await installed(normal)).toBe('1.0.0');

    const exception = await project(
      'exception',
      `${policy}\nminimumReleaseAgeExcludes = ["${name}@1.0.1"]`,
    );
    await install(exception);
    expect(await installed(exception)).toBe('1.0.1');

    const lock = await readFile(join(exception, 'bun.lock'), 'utf8');
    const manifest = await readFile(join(exception, 'package.json'), 'utf8');
    await writeFile(join(exception, 'bunfig.toml'), `${policy}\nregistry = "${server.url.href}"\n`);
    await rm(join(exception, 'node_modules'), { recursive: true });
    await rm(env.BUN_INSTALL_CACHE_DIR, { recursive: true, force: true });
    await install(exception, true);
    expect(await installed(exception)).toBe('1.0.1');
    expect(await readFile(join(exception, 'bun.lock'), 'utf8')).toBe(lock);
    expect(await readFile(join(exception, 'package.json'), 'utf8')).toBe(manifest);
  } finally {
    await server.stop(true);
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
