/**
 * send.js 숫자 정리 로직 단위 테스트 (에뮬레이터 없이 실행 가능)
 * 실행: node tests/cloud/unit.test.mjs
 */

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

// send.js의 내부 함수를 직접 복사해 테스트
function clamp(v, lo, hi) {
  if (v == null || isNaN(v) || !isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}
function clamp1(v) { return Math.round(v * 10) / 10; }
function volDb(masterVolume) {
  if (masterVolume == null || isNaN(masterVolume) || masterVolume <= 0) return -60;
  const db = 20 * Math.log10(masterVolume);
  if (!isFinite(db)) return -60;
  return db;
}
function nullableNum(v, lo, hi) {
  if (v == null || isNaN(v) || !isFinite(v)) return null;
  return clamp1(clamp(v, lo, hi));
}

// ===== volDb =====
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

// ===== earId 형식 =====
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeId() {
  const bytes = new Uint8Array(10);
  // Node 22에서 globalThis.crypto 사용
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

test('earId: 10자, 허용 글자만', () => {
  for (let i = 0; i < 20; i++) {
    const id = makeId();
    assert(id.length === 10, `length: ${id.length}`);
    assert(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/.test(id), `invalid: ${id}`);
    assert(!/[0O1I]/.test(id), `헷갈리는 글자 포함: ${id}`);
  }
});

console.log(`\n단위 테스트: ${pass}개 통과, ${fail}개 실패`);
if (fail > 0) process.exit(1);
