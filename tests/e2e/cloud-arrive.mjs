// 앱 전 과정(flow.mjs, ?emulator=1)을 돌리는 동안 tests/feed 페이지가 onArrive를 언제 받는지 잼
// 준비: Firestore 에뮬레이터(8080), python3 -m http.server 8765
// 실행: node tests/e2e/cloud-arrive.mjs <출력폴더(절대경로)>
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await fetch('http://127.0.0.1:8080/emulator/v1/projects/svart-test/databases/(default)/documents', { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=9334', '--user-data-dir=' + OUT + '/feed-profile', 'about:blank'
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());
await sleep(2000);
const t = (await (await fetch('http://127.0.0.1:9334/json')).json()).find((x) => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = {};
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (pend[d.id]) pend[d.id](d); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.navigate', { url: 'http://localhost:8765/tests/feed/index.html?emulator=1' });
await sleep(4000);

const flow = spawn('node', ['tests/e2e/flow.mjs', OUT + '/flow', 'ko'], {
  env: { ...process.env, FLOW_QUERY: '?emulator=1' }, stdio: ['ignore', 'pipe', 'inherit']
});
let tail = '';
flow.stdout.on('data', (d) => { tail = (tail + d).slice(-300); });
const code = await new Promise((r) => flow.on('close', r));
const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__arrivals || [])', returnByValue: true });
const arrivals = JSON.parse(r.result.result.value);
console.log('flow exit', code, tail.trim().split('\n').pop());
console.log('arrivals', arrivals.length);
arrivals.forEach((a) => console.log(`  ${a.earId} animate:${a.animate} 서버 저장→도착 ${a.at - a.createdAt} ms`));
process.exit(code === 0 && arrivals.length >= 1 && arrivals.every((a) => a.at - a.createdAt < 1000) ? 0 : 1);
