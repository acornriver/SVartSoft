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
 *   1. 전송 차단: ?dev=1에서 문서 안 생김
 *   2. 숫자 정리: masterVolume=0, NaN이 거부 없이 저장
 *   3. 정상 전송: EAR_RESULT → Firestore 문서 생성
 *   4. 오프라인 복귀: 오프라인 2건 보내기 → 온라인 복귀 → 2건 모두 도착(중복 없음)
 *   5. 재시작 복구: sendEar 후 페이지 리로드 → 대기열에서 자동 재전송
 *   6. 재전송: 같은 earId를 또 보내도 문서 1개, 대기열에서 지워짐
 *   7. 규칙 거부: 잘못된 문서가 rejected로 옮겨지고 대기열이 막히지 않음
 */

import { spawn } from 'child_process';
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
const EMULATOR_HOST = 'http://127.0.0.1:8080';
const OWNER = { Authorization: 'Bearer owner' };
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
  const r = await fetch(url, { headers: OWNER });
  if (!r.ok) return null;
  return r.json();
}

async function listEmulatorDocs(projectId, collection) {
  const url = `${EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  const r = await fetch(url, { headers: OWNER });
  if (!r.ok) return [];
  const j = await r.json();
  return j.documents || [];
}

async function clearEmulator(projectId) {
  await fetch(
    `${EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE', headers: OWNER }
  );
}

// ===== 테스트 ======

const PROJECT_ID = 'svart-test';
let results = { errors: [] };

async function runTests() {
  // Chrome 실행
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9333', '--user-data-dir=' + OUT + '/profile', 'about:blank'
  ], { stdio: 'ignore' });
  process.on('exit', () => chrome.kill());
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

  // ===== 테스트 4: 오프라인 복귀 (CDP Network.emulateNetworkConditions) =====
  console.log('\n=== 테스트 4: 오프라인 복귀 ===');
  await clearEmulator(PROJECT_ID);
  await navigate(`${BASE}?emulator=1`);
  await sleep(1000);

  // 오프라인으로
  await cdp('Network.enable');
  await cdp('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0
  });
  await sleep(300);

  // 오프라인 상태에서 2건 보내기
  const offlineIds = await evalExpr(`
    const a = window.svartCloud?.sendEar({ name: '오프라인1', code: 'AES/5 · CLF 12.0',
      userEQProfile: { masterVolume: 0.5, lowShelf: { freq: 200, gain: 0 }, highShelf: { freq: 4000, gain: 0 }, registerPeak: { register: 'MID', freq: 400, gain: 3, q: 1 } },
      psychoProfile: { maxFreqHz: 12000, sensitivity: 60, twist: 0.5, centerDeg: 0, centerImage: 'C', dominantEar: 'RIGHT', earStrength: 70, pitchMode: 'F', pitchIndex: 30, raw: {} },
      savedAt: Date.now(), lang: 'ko'
    });
    const b = window.svartCloud?.sendEar({ name: '오프라인2', code: 'AES/5 · CLF 12.0',
      userEQProfile: { masterVolume: 0.5, lowShelf: { freq: 200, gain: 0 }, highShelf: { freq: 4000, gain: 0 }, registerPeak: { register: 'MID', freq: 400, gain: 3, q: 1 } },
      psychoProfile: { maxFreqHz: 12000, sensitivity: 60, twist: 0.5, centerDeg: 0, centerImage: 'C', dominantEar: 'LEFT', earStrength: 60, pitchMode: 'H', pitchIndex: 50, raw: {} },
      savedAt: Date.now(), lang: 'ko'
    });
    JSON.stringify([a, b])
  `);
  await sleep(2000);

  // 에뮬레이터 문서 없어야 함 (오프라인)
  const offlineDocs = await listEmulatorDocs(PROJECT_ID, 'ears');
  if (offlineDocs.length > 0) {
    results.errors.push(`테스트 4 실패: 오프라인 중 문서가 ${offlineDocs.length}개 생겼음`);
  } else {
    console.log('  ✓ 오프라인 중 문서 없음');
  }

  // 온라인 복귀
  await cdp('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
  });
  // online 이벤트 발화 (send.js가 듣고 있음)
  await evalExpr(`window.dispatchEvent(new Event('online'))`);
  await sleep(10000); // 플러시 대기

  const onlineDocs = await listEmulatorDocs(PROJECT_ID, 'ears');
  if (onlineDocs.length === 2) {
    console.log('✅ 오프라인 복귀 후 2건 모두 도착');
  } else {
    results.errors.push(`테스트 4 실패: 온라인 복귀 후 문서 ${onlineDocs.length}개 (기대: 2)`);
  }
  if ((await evalExpr(`JSON.parse(localStorage.getItem('svart.outbox') || '[]').length`)) !== 0) {
    results.errors.push('테스트 4 실패: 대기열이 남음');
  }

  // ===== 테스트 5: 재시작 복구 =====
  console.log('\n=== 테스트 5: 재시작 복구 ===');
  await clearEmulator(PROJECT_ID);
  await navigate(`${BASE}?emulator=1`);
  await sleep(1000);

  // 오프라인으로 → 1건 보내기 → localStorage에 대기
  await cdp('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0
  });
  const restartId = await evalExpr(`
    window.svartCloud?.sendEar({ name: '재시작', code: 'IwS/5 · RLF 12.0',
      userEQProfile: { masterVolume: 0.6, lowShelf: { freq: 200, gain: 2 }, highShelf: { freq: 4000, gain: -2 }, registerPeak: { register: 'HIGH', freq: 2500, gain: 3, q: 1 } },
      psychoProfile: { maxFreqHz: 13000, sensitivity: 55, twist: 0.4, centerDeg: 20, centerImage: 'R', dominantEar: 'LEFT', earStrength: 80, pitchMode: 'B', pitchIndex: 45, raw: {} },
      savedAt: Date.now(), lang: 'ko'
    })
  `);
  await sleep(2000);

  // 온라인 복귀 후 페이지 리로드 (localStorage의 대기열이 살아있어야 함)
  await cdp('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
  });
  await navigate(`${BASE}?emulator=1`); // 리로드 (새 navigate = localStorage 보존)
  await sleep(10000); // 재시작 후 플러시 대기

  if (restartId) {
    const restartDoc = await getEmulatorDoc(PROJECT_ID, `ears/${restartId}`);
    if (restartDoc) {
      console.log('✅ 재시작 복구 후 문서 도착:', restartId);
    } else {
      results.errors.push('테스트 5 실패: 재시작 후 문서 없음');
    }
  } else {
    results.errors.push('테스트 5 실패: earId 없음');
  }

  const outbox = () => evalExpr(`JSON.parse(localStorage.getItem('svart.outbox') || '[]').length`);
  const rejected = () => evalExpr(`JSON.parse(localStorage.getItem('svart.outbox.rejected') || '[]').length`);
  const inject = (entry) => evalExpr(`
    localStorage.setItem('svart.outbox', JSON.stringify([${JSON.stringify(entry)}]));
    window.dispatchEvent(new Event('online')); 1
  `);
  const check = (cond, okMsg, failMsg) => {
    if (cond) console.log('✅', okMsg); else results.errors.push(failMsg);
  };
  check((await outbox()) === 0, '재시작 후 대기열 비어 있음', `테스트 5 실패: 대기열 ${await outbox()}건 남음`);

  // ===== 테스트 6: 재전송 (같은 earId를 두 번) =====
  console.log('\n=== 테스트 6: 같은 earId 재전송 ===');
  await clearEmulator(PROJECT_ID);
  await navigate(`${BASE}?emulator=1`);
  await sleep(1000);
  const dupId = await evalExpr(`
    window.svartCloud?.sendEar({ code: 'IwS/5', userEQProfile: { masterVolume: 0.5 }, psychoProfile: {}, savedAt: Date.now(), lang: 'ko' })
  `);
  await sleep(4000);
  const first = await getEmulatorDoc(PROJECT_ID, `ears/${dupId}`);
  await inject({ earId: dupId, attempts: 0, nextAt: 0, doc: {
    v: 1, earId: dupId, code: 'IwS/5', codeVersion: 1, name: null, lang: 'ko', seat: null,
    clientAt: Date.now(), hidden: false, app: '1.0.0',
    profile: { volDb: -6, lowDb: 0, highDb: 0, register: null, maxFreqHz: null, sensitivity: null, twistAmount: null,
      centerDeg: null, centerImage: null, dominantEar: null, earStrength: null, pitchMode: null, pitchIndex: null }
  } });
  await sleep(6000);
  const dupDocs = await listEmulatorDocs(PROJECT_ID, 'ears');
  const second = await getEmulatorDoc(PROJECT_ID, `ears/${dupId}`);
  check(first && dupDocs.length === 1 && first.updateTime === second?.updateTime, '문서 1개, 내용 그대로',
    `테스트 6 실패: 문서 ${dupDocs.length}개`);
  check((await outbox()) === 0 && (await rejected()) === 0, '재전송 항목이 대기열에서 지워지고 거부로 안 감',
    `테스트 6 실패: 대기열 ${await outbox()} 거부 ${await rejected()}`);

  // ===== 테스트 7: 진짜 규칙 거부 → rejected 보관 =====
  console.log('\n=== 테스트 7: 규칙 거부 ===');
  await clearEmulator(PROJECT_ID);
  await inject({ earId: 'BADDATA234', attempts: 0, nextAt: 0, doc: {
    v: 1, earId: 'BADDATA234', code: 'x', codeVersion: 1, name: null, lang: 'jp', seat: null,
    clientAt: Date.now(), hidden: false, app: '1.0.0',
    profile: { volDb: -6, lowDb: 0, highDb: 0, register: null, maxFreqHz: null, sensitivity: null, twistAmount: null,
      centerDeg: null, centerImage: null, dominantEar: null, earStrength: null, pitchMode: null, pitchIndex: null }
  } });
  await sleep(6000);
  check((await outbox()) === 0 && (await rejected()) === 1, '거부된 문서가 rejected로 이동',
    `테스트 7 실패: 대기열 ${await outbox()} 거부 ${await rejected()}`);

  // ===== 결과 =====
  ws.close();
  writeFileSync(join(OUT, 'cloud-results.json'), JSON.stringify(results, null, 2));

  console.log('\n=== 클라우드 흐름 테스트 결과 ===');
  if (results.errors.length === 0) {
    console.log('errors: none');
    process.exit(0);
  } else {
    results.errors.forEach(e => console.error('ERROR:', e));
    process.exit(1);
  }
}

runTests().catch(e => { console.error(e); process.exit(1); });
