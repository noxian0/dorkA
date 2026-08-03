import express from 'express';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '..');
const defaultDataDir = path.join(rootDir, 'data');
const distDir = path.join(rootDir, 'dist');
const app = express();
let dataDir = defaultDataDir;
let workspaceFile = path.join(dataDir, 'workspace.json');
let serverInstance;

const defaults = {
  saved: [
    { id: 'saved-1', name: 'Public policy pages', query: 'site:example.com ("security policy" OR "responsible disclosure")', tags: ['policy', 'trust'], scope: 'example.com', notes: 'Review public trust and policy pages after changes.', timestamp: '2026-08-02T13:32:00.000Z', favorite: true },
    { id: 'saved-2', name: 'Indexed PDF resources', query: 'site:example.com filetype:pdf', tags: ['content', 'documentation'], scope: 'example.com', notes: 'Review which public PDFs appear in search results.', timestamp: '2026-07-28T09:15:00.000Z', favorite: false },
    { id: 'saved-3', name: 'Support surface review', query: 'site:example.com (inurl:support OR inurl:help)', tags: ['support'], scope: 'example.com', notes: 'A concise view of public support routes.', timestamp: '2026-07-21T16:48:00.000Z', favorite: false },
  ],
  history: [
    { id: 'hist-1', query: 'site:example.com filetype:pdf', timestamp: '2026-08-03T08:40:00.000Z', scope: 'example.com' },
    { id: 'hist-2', query: 'site:example.com "security.txt"', timestamp: '2026-08-02T15:05:00.000Z', scope: 'example.com' },
    { id: 'hist-3', query: 'site:example.com inurl:help', timestamp: '2026-08-01T11:30:00.000Z', scope: 'example.com' },
  ],
  prefs: { comfortable: true, reminders: true, history: true, theme: 'dark' },
};

function cleanWorkspace(value) {
  return {
    saved: Array.isArray(value?.saved) ? value.saved : defaults.saved,
    history: Array.isArray(value?.history) ? value.history : defaults.history,
    prefs: { ...defaults.prefs, ...(value?.prefs || {}) },
  };
}

async function readWorkspace() {
  try {
    return cleanWorkspace(JSON.parse(await readFile(workspaceFile, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not read local workspace data; using defaults.');
    return structuredClone(defaults);
  }
}

async function writeWorkspace(workspace) {
  await mkdir(dataDir, { recursive: true });
  const tempFile = `${workspaceFile}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(workspace, null, 2)}\n`, 'utf8');
  await rename(tempFile, workspaceFile);
}

let writeQueue = Promise.resolve();
async function updateWorkspace(transform) {
  let result;
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const current = await readWorkspace();
    result = cleanWorkspace(transform(current));
    await writeWorkspace(result);
  });
  await writeQueue;
  return result;
}

function isArray(value) { return Array.isArray(value); }

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_request, response) => response.json({ status: 'ok', storage: 'local-file' }));
app.get('/api/workspace', async (_request, response, next) => {
  try { response.json(await readWorkspace()); } catch (error) { next(error); }
});

app.put('/api/saved-queries', async (request, response, next) => {
  if (!isArray(request.body?.saved)) return response.status(400).json({ error: 'saved must be an array' });
  try { response.json((await updateWorkspace(current => ({ ...current, saved: request.body.saved }))).saved); } catch (error) { next(error); }
});

app.put('/api/history', async (request, response, next) => {
  if (!isArray(request.body?.history)) return response.status(400).json({ error: 'history must be an array' });
  try { response.json((await updateWorkspace(current => ({ ...current, history: request.body.history }))).history); } catch (error) { next(error); }
});

app.put('/api/preferences', async (request, response, next) => {
  if (!request.body?.prefs || typeof request.body.prefs !== 'object' || Array.isArray(request.body.prefs)) return response.status(400).json({ error: 'prefs must be an object' });
  try { response.json((await updateWorkspace(current => ({ ...current, prefs: { ...current.prefs, ...request.body.prefs } }))).prefs); } catch (error) { next(error); }
});

app.use(express.static(distDir, { index: false }));
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
  const indexFile = path.join(distDir, 'index.html');
  if (!existsSync(indexFile)) return response.status(503).send('DorkA is preparing its interface. Run npm run build, then start the app again.');
  return response.sendFile(indexFile);
});

app.use((error, _request, response, _next) => {
  console.error('DorkA server error:', error.message);
  response.status(500).json({ error: 'The local workspace could not save your change.' });
});

export async function startServer({ storageDir = defaultDataDir, port = Number(process.env.PORT || 5173), host = process.env.HOST || '127.0.0.1' } = {}) {
  if (serverInstance) return serverInstance;
  dataDir = storageDir;
  workspaceFile = path.join(dataDir, 'workspace.json');
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      serverInstance = server;
      console.log(`dorkA local service is running at http://${host}:${port}`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

const launchedDirectly = process.argv[1] && path.resolve(process.argv[1]) === currentFile;
if (launchedDirectly) {
  startServer().catch(error => {
    console.error('Could not start dorkA local service:', error.message);
    process.exitCode = 1;
  });
}
