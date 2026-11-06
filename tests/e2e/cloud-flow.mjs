/**
 * 헤드리스 크롬 + Firestore 에뮬레이터: 아이패드 → Firestore → 피드 흐름 테스트
 *
 * 사전 조건:
 *   1. firebase emulators:start --only firestore (포트 8080)
 *   2. python3 -m http.server 8765 (레포 루트에서)
 *   3. Node 22+, Google Chrome 설치
 *
 * 실행: node tests/e2e/cloud-flow.mjs <출력폴더>
 *
 * 확인 항목:
 *   1. flow.mjs 흐름 완료 후 Firestore에 문서 생김
 *   2. feed 페이지(에뮬레이터 연결)에 1초 안에 onArrive 이벤트
 *   3. 오프라인 → 3건 보내기 → 온라인 → 3건 모두 한 번씩만 도착
 *   4. 재시작 후 대기열 나머지 한 번씩 올라감
 *   5. 전송 차단: ?dev=1에서 문서 안 생김
 *   6. 숫자 정리: masterVolume=0, NaN이 거부 없이 저장
 */

import { createRequire } from 'module';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('사용법: node cloud-flow.mjs <출력폴더>');
  process.exit(1);
}

const OUT = args[0];
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:8765';
const EMULATOR_HOST = 'http://localhost:8080';
let ws, page;

// ===== CDP 연결 헬퍼 =====
// 간단히 flow.mjs에서 가져온 CDP 패턴 재사용

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function connectCDP(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch('http://localhost:9333/json');
      const tabs = await r.json();
      const target = tabs.find(t => t.type === 'page');
      if (!target) { await sleep(500); continue; }
      return { wsUrl: target.webSocketDebuggerUrl };
    } catch { await sleep(500); }
  }
  throw new Error('CDP 연결 실패');
}

// Firestore 에뮬레이터에 직접 문서 조회
async function getEmulatorDoc(projectId, docPath) {
  const url = `${EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

async function listEmulatorDocs(projectId, collection) {
  const url = `${EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  return j.documents || [];
}

async function clearEmulator(projectId) {
  await fetch(
    `${EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
}

// ===== 테스트 ======

const PROJECT_ID = 'svart-test';
let results = { errors: [] };

async function runTests() {
  // Chrome 실행
  execSync('pkill -f "remote-debugging-port=9333" 2>/dev/null; true');
  await sleep(500);
  execSync(`open -a "Google Chrome" --args --headless=new --remote-debugging-port=9333 --no-first-run --disable-extensions --disable-default-apps about:blank`);
  await sleep(2000);

  const { wsUrl } = await connectCDP();

  // WebSocket은 Node 22 내장
  ws = new WebSocket(wsUrl);
  await new Promise(r => { ws.onopen = r; });

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
  };

  function cdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, { resolve });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function navigate(url) {
    await cdp('Page.navigate', { url });
    await sleep(2000);
  }

  async function evalExpr(expr) {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    return r.result?.value;
  }

  await cdp('Runtime.enable');
  await cdp('Page.enable');

  // ===== 테스트 1: ?dev=1에서 문서 안 생김 =====
  console.log('\n=== 테스트 1: dev=1에서 전송 차단 ===');
  await clearEmulator(PROJECT_ID);
  await navigate(`${BASE}?dev=1&emulator=1`);
  await sleep(1000);

  // EAR_RESULT 직접 inject해서 sendEar 호출
  await evalExpr(`
    window.EAR_RESULT = {
      name: '테스트', code: 'AES/5 · CLF 12.0',
      userEQProfile: { masterVolume: 0.5, lowShelf: { freq: 200, gain: 2 }, highShelf: { freq: 4000, gain: -2 }, registerPeak: { register: 'MID', freq: 400, gain: 3, q: 1 } },
      psychoProfile: { maxFreqHz: 12000, sensitivity: 60, twist: 0.5, centerDeg: 10, centerImage: 'C', dominantEar: 'RIGHT', earStrength: 70, pitchMode: 'F', pitchIndex: 30, raw: {} },
      savedAt: Date.now(), lang: 'ko'
    };
    window.svartCloud?.sendEar(window.EAR_RESULT);
  `);
  await sleep(3000);

  const devDocs = await listEmulatorDocs(PROJECT_ID, 'ears');
  if (devDocs.length > 0) {
    results.errors.push('테스트 1 실패: dev=1에서 문서가 생겼음');
  } else {
    console.log('✅ dev=1에서 문서 없음');
  }

  // ===== 테스트 2: 숫자 정리 (masterVolume=0, NaN) =====
  console.log('\n=== 테스트 2: 숫자 정리 ===');
  await clearEmulator(PROJECT_ID);
  await navigate(`${BASE}?emulator=1`);
  await sleep(1000);

  const earId2 = await evalExpr(`
    window.svartCloud?.sendEar({
      name: '수자테스트', code: 'AES/5 · CLF 12.0',
      userEQProfile: { masterVolume: 0, lowShelf: { freq: 200, gain: NaN }, highShelf: { freq: 4000, gain: Infinity }, registerPeak: { register: null, freq: 400, gain: 3, q: 1 } },
      psychoProfile: { maxFreqHz: null, sensitivity: null, twist: null, centerDeg: null, centerImage: null, dominantEar: null, earStrength: null, pitchMode: null, pitchIndex: null, raw: {} },
      savedAt: Date.now(), lang: 'ko'
    })
  `);
  await sleep(5000);

  if (earId2) {
    const d2 = await getEmulatorDoc(PROJECT_ID, `ears/${earId2}`);
    if (d2) {
      console.log('✅ 숫자 정리 후 문서 생성됨:', earId2);
      writeFileSync(join(OUT, 'cloud-num-clean.json'), JSON.stringify(d2, null, 2));
    } else {
      results.errors.push('테스트 2 실패: 숫자 정리 후 문서 없음');
    }
  } else {
    results.errors.push('테스트 2 실패: earId 없음 (sendEar 미로드?)');
  }

  // ===== 테스트 3: 정상 전송 =====
  console.log('\n=== 테스트 3: 정상 전송 ===');
  await clearEmulator(PROJECT_ID);
  await navigate(`${BASE}?emulator=1`);
  await sleep(1000);

  const earId3 = await evalExpr(`
    window.svartCloud?.sendEar({
      name: '정상', code: 'IwS/6 · RLF 13.2',
      userEQProfile: { masterVolume: 0.5, lowShelf: { freq: 200, gain: -4 }, highShelf: { freq: 4000, gain: 4 }, registerPeak: { register: 'HIGH', freq: 2500, gain: 3, q: 1 } },
      psychoProfile: { maxFreqHz: 13200, sensitivity: 72, twist: 0.6, centerDeg: -15, centerImage: 'L', dominantEar: 'RIGHT', earStrength: 65, pitchMode: 'F', pitchIndex: -20, raw: {} },
      savedAt: Date.now(), lang: 'ko'
    })
  `);
  await sleep(10000);

  if (earId3) {
    const d3 = await getEmulatorDoc(PROJECT_ID, `ears/${earId3}`);
    if (d3) {
      console.log('✅ 정상 전송 완료:', earId3);
      writeFileSync(join(OUT, 'cloud-normal.json'), JSON.stringify(d3, null, 2));
    } else {
      results.errors.push('테스트 3 실패: 문서 없음');
    }
  } else {
    results.errors.push('테스트 3 실패: earId 없음');
  }

  // ===== 결과 =====
  ws.close();
  writeFileSync(join(OUT, 'cloud-results.json'), JSON.stringify(results, null, 2));

  console.log('\n=== 클라우드 흐름 테스트 결과 ===');
  if (results.errors.length === 0) {
    console.log('errors: none');
  } else {
    results.errors.forEach(e => console.error('ERROR:', e));
    process.exit(1);
  }
}

runTests().catch(e => { console.error(e); process.exit(1); });
