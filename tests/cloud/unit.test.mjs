/**
 * send.js 숫자 정리 로직 단위 테스트 (에뮬레이터 없이 실행 가능)
 * 실행: node tests/cloud/unit.test.mjs
 */

import vm from 'node:vm';
import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅', name);
    pass++;
  } catch (e) {
    console.error('❌', name, e.message);
    fail++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

// 진짜 cloud/send.js를 브라우저 대역과 함께 불러와 내부 함수를 그대로 검사
const store = new Map();
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  crypto: globalThis.crypto,
  setTimeout: () => 0, clearTimeout() {},
  location: { search: '', hostname: 'example.com' },
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
  window: { addEventListener() {}, CloudConfig: { NAME_MAX_LEN: 12, APP_VERSION: '1.0.0', STORE_NAMES: false, BANNED_WORDS: [] }, GlobalState: { lang: 'ko' } },
  document: {}
};
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../../cloud/send.js', import.meta.url), 'utf8'), sandbox);
const { _clamp: clamp, _clamp1: clamp1, _volDb: volDb, _nullableNum: nullableNum, _makeId: makeId, _buildDoc: buildDoc,
  _enqueue: enqueue, _loadQueue: loadQueue, _scheduleRetry: scheduleRetry } = sandbox;

test('volDb: masterVolume=0 → -60', () => {
  assert(volDb(0) === -60, `got ${volDb(0)}`);
});
test('volDb: masterVolume=null → -60', () => {
  assert(volDb(null) === -60, `got ${volDb(null)}`);
});
test('volDb: masterVolume=NaN → -60', () => {
  assert(volDb(NaN) === -60, `got ${volDb(NaN)}`);
});
test('volDb: masterVolume=1 → 0', () => {
  assert(volDb(1) === 0, `got ${volDb(1)}`);
});
test('volDb: masterVolume=0.5 → ~-6', () => {
  const v = volDb(0.5);
  assert(v > -7 && v < -5, `got ${v}`);
});

// ===== clamp + range =====
test('clamp: 10.0000001 → 10', () => {
  assert(clamp(10.0000001, -10, 10) === 10, 'lowDb 경계 초과값');
});
test('clamp: -60.0 → -60', () => {
  assert(clamp(-60, -60, 0) === -60, 'volDb 경계');
});
test('clamp: Infinity → lo', () => {
  assert(clamp(Infinity, -10, 10) === -10, 'Infinity → lo');
});
test('clamp: NaN → lo', () => {
  assert(isNaN(clamp(NaN, -10, 10)) === false, 'NaN → lo');
  assert(clamp(NaN, -10, 10) === -10, `got ${clamp(NaN, -10, 10)}`);
});

// ===== nullableNum =====
test('nullableNum: null → null', () => {
  assert(nullableNum(null, 0, 100) === null);
});
test('nullableNum: NaN → null', () => {
  assert(nullableNum(NaN, 0, 100) === null);
});
test('nullableNum: 50.456 → 50.5', () => {
  assert(nullableNum(50.456, 0, 100) === 50.5, `got ${nullableNum(50.456, 0, 100)}`);
});
test('nullableNum: 101 → 100', () => {
  assert(nullableNum(101, 0, 100) === 100, `got ${nullableNum(101, 0, 100)}`);
});

test('earId: 10자, 허용 글자만', () => {
  for (let i = 0; i < 20; i++) {
    const id = makeId();
    assert(id.length === 10, `length: ${id.length}`);
    assert(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/.test(id), `invalid: ${id}`);
    assert(!/[0O1I]/.test(id), `헷갈리는 글자 포함: ${id}`);
  }
});

// ===== 대기열과 백오프 (5→10→20→40→60초) =====
test('대기열: 항목이 저장되고 같은 earId는 한 번만', () => {
  store.clear();
  enqueue('ABCDE12345', { v: 1 });
  enqueue('ABCDE12345', { v: 1 });
  const q = loadQueue();
  assert(q.length === 1 && q[0].earId === 'ABCDE12345' && q[0].attempts === 0, JSON.stringify(q));
});
test('백오프: 실패할수록 두 배, 60초에서 멈춤', () => {
  store.clear();
  enqueue('ABCDE12345', { v: 1 });
  const entry = { earId: 'ABCDE12345' };
  [5, 10, 20, 40, 60, 60].forEach((sec) => {
    const before = Date.now();
    scheduleRetry(entry);
    const d = loadQueue()[0].nextAt - before;
    assert(d >= sec * 1000 && d < sec * 1000 + 1000, `${sec}초 기대, ${d}ms`);
  });
});

// ===== 문서 만들기 =====
test('문서: 이름 저장을 끄면 name은 null, 숫자는 범위 안으로', () => {
  const doc = buildDoc({
    name: '이름', code: 'IwS/6 · RLF 13.2', savedAt: 123,
    userEQProfile: { masterVolume: 0, lowShelf: { gain: 99 }, highShelf: { gain: NaN }, registerPeak: { register: 'BAD' } },
    psychoProfile: { maxFreqHz: 99999, sensitivity: null }
  }, 'ABCDE12345');
  assert(doc.name === null, 'name');
  assert(doc.profile.volDb === -60 && doc.profile.lowDb === 10 && doc.profile.highDb === -10, JSON.stringify(doc.profile));
  assert(doc.profile.register === null && doc.profile.maxFreqHz === 16000 && doc.profile.sensitivity === null, JSON.stringify(doc.profile));
  assert(doc.hidden === false && doc.earId === 'ABCDE12345' && doc.clientAt === 123, 'fields');
});

// ===== earId 중복 없음 (1000개) =====
test('earId: 1000개 생성 중 중복 없음', () => {
  const ids = new Set();
  for (let i = 0; i < 1000; i++) ids.add(makeId());
  assert(ids.size === 1000, `중복 발생: 생성 1000, 고유 ${ids.size}`);
});

console.log(`\n단위 테스트: ${pass}개 통과, ${fail}개 실패`);
if (fail > 0) process.exit(1);
