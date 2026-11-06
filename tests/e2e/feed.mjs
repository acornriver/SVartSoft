// 피드 동작 테스트: 숨김 onRemove, 끊겼다 복구, 재연결, 방치. 실제 cloud/feed.js를 tests/feed 페이지로 띄워 확인
// 준비: Firestore 에뮬레이터(8080), 레포 루트에서 python3 -m http.server 8765
// 실행: node tests/e2e/feed.mjs <출력폴더(절대경로)>   (크롬 디버깅 포트 9336, 2분 30초쯤)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const PORT = 9336;
const EMU = 'http://127.0.0.1:8080';
const DOCS = `${EMU}/v1/projects/svart-test/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const check = (ok, msg) => { console.log(ok ? '✅' : '❌', msg); if (!ok) errors.push(msg); };

const fields = (id, hidden = false) => ({
  earId: { stringValue: id }, code: { stringValue: 'IwS/5' }, hidden: { booleanValue: hidden },
  createdAt: { timestampValue: new Date().toISOString() }, lang: { stringValue: 'ko' }
});
const put = (id, hidden) => fetch(`${DOCS}/ears/${id}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: fields(id, hidden) }) });

await fetch(`${EMU}/emulator/v1/projects/svart-test/databases/(default)/documents`, { method: 'DELETE', headers: OWNER });
await put('AAAAAAAAAA'); await put('BBBBBBBBBB');

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/profile`, 'about:blank'
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());
await sleep(2000);
const tab = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = {}; let reconnects = 0;
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (pend[d.id]) pend[d.id](d);
  if (d.method === 'Runtime.consoleAPICalled' && JSON.stringify(d.params.args).includes('리스너 재연결')) reconnects++;
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
const arrivals = async () => JSON.parse(await ev('JSON.stringify(window.__arrivals || [])'));
const removed = async () => JSON.parse(await ev('JSON.stringify(window.__removed || [])'));

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
// 재연결 기준을 줄임 (캐시 상태가 1초 넘으면 다음 점검 때 재연결)
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  Object.defineProperty(window, 'CloudConfig', { configurable: true,
    set(v) { v.FEED_CACHE_TIMEOUT_MS = 1000; this.__cfg = v; }, get() { return this.__cfg; } });` });
await send('Page.navigate', { url: 'http://localhost:8765/tests/feed/index.html?emulator=1' });
await sleep(4000);
check((await ev('window.__initials')) === 1, '시작하면 onInitial 한 번');

console.log('\n=== 숨김 ===');
await put('AAAAAAAAAA', true);
await sleep(1500);
check((await removed()).includes('AAAAAAAAAA'), 'hidden: true → onRemove');

console.log('\n=== 방치 (90초, 점검 3번) ===');
await sleep(90000);
check(reconnects === 0, `방치 중 리스너 재연결 없음 (${reconnects}번)`);

console.log('\n=== 네트워크 끊김 → 복구 (짧게, 도착 기준 60초 안) ===');
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await sleep(1500);
await put('CCCCCCCCCC'); await put('DDDDDDDDDD');
await put('BBBBBBBBBB', true);
await sleep(1500);
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await sleep(12000);
let a = await arrivals();
check(a.some((x) => x.earId === 'CCCCCCCCCC') && a.some((x) => x.earId === 'DDDDDDDDDD'), '끊긴 동안 생긴 문서 도착');
check(a.filter((x) => x.animate).length === 0, `끊긴 동안 생긴 문서는 animate: false (${JSON.stringify(a.map((x) => x.animate))})`);
check((await removed()).includes('BBBBBBBBBB'), '끊긴 동안 숨긴 문서도 onRemove');
check((await ev('window.__initials')) === 1, '복구 뒤 onInitial 다시 안 옴');

console.log('\n=== 복구 뒤 새 도착 ===');
await put('EEEEEEEEEE');
await sleep(1500);
a = await arrivals();
check(a.find((x) => x.earId === 'EEEEEEEEEE')?.animate === true, '복구 뒤 새 문서는 animate: true');

console.log('\n=== 끊긴 채 리스너 재연결 (접속은 살아 있고 서버만 안 닿음) ===');
await send('Network.setBlockedURLs', { urls: ['*:8080*'] });
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await sleep(1500);
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await put('FFFFFFFFFF'); await put('EEEEEEEEEE', true);
for (let i = 0; i < 40 && reconnects === 0; i++) await sleep(1000);
check(reconnects > 0, `서버가 안 닿으면 리스너 재연결 (${reconnects}번)`);
await send('Network.setBlockedURLs', { urls: [] });
await sleep(20000);
if (reconnects === 0 || !(await arrivals()).some((x) => x.earId === 'FFFFFFFFFF')) await sleep(35000);
a = await arrivals();
check(a.find((x) => x.earId === 'FFFFFFFFFF')?.animate === false, `재연결 뒤 끊긴 동안 문서는 animate: false (${a.find((x) => x.earId === 'FFFFFFFFFF')?.animate})`);
check((await removed()).includes('EEEEEEEEEE'), '재연결 뒤 끊긴 동안 숨긴 문서도 onRemove');
check((await ev('window.__initials')) === 1, '재연결 뒤 onInitial 다시 안 옴');

console.log(errors.length ? `\nerrors: ${errors.length}` : '\nerrors: none');
process.exit(errors.length ? 1 : 0);
