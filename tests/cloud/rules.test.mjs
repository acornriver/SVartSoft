/**
 * Firestore 보안 규칙 테스트
 * 실행: Firestore 에뮬레이터가 8080 포트에 떠 있어야 함
 *   firebase emulators:start --only firestore
 *   node rules.test.mjs
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dir, '../../firestore.rules'), 'utf8');

const PROJECT_ID = 'svart-test-rules';

// 유효한 문서 베이스
const VALID_EAR_ID = 'ABCDE12345';

function validDoc(overrides = {}, profileOverrides = {}) {
  return {
    v: 1,
    earId: VALID_EAR_ID,
    code: 'AES/5 · CLF 12.0',
    codeVersion: 1,
    profile: {
      volDb: -20.0,
      lowDb: 2.0,
      highDb: -3.0,
      register: 'MID',
      maxFreqHz: 12000,
      sensitivity: 60,
      twistAmount: 0.5,
      centerDeg: 10.0,
      centerImage: 'C',
      dominantEar: 'RIGHT',
      earStrength: 70,
      pitchMode: 'F',
      pitchIndex: 30.0,
      ...profileOverrides
    },
    name: '테스트',
    lang: 'ko',
    seat: 2,
    clientAt: Date.now(),
    hidden: false,
    app: '1.0.0',
    ...overrides
  };
}

let testEnv;

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: 'localhost', port: 8080 }
  });
}

async function teardown() {
  await testEnv.cleanup();
}

async function run() {
  await setup();

  let pass = 0;
  let fail = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('✅', name);
      pass++;
    } catch (e) {
      console.error('❌', name, e.message);
      fail++;
    }
    // 각 테스트 사이 데이터 초기화
    await testEnv.clearFirestore();
  }

  const auth = testEnv.unauthenticatedContext();
  const db = auth.firestore();

  // ===== 허용 케이스 =====

  await test('허용: 유효한 문서 create', async () => {
    const d = validDoc();
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: Part 2 필드 전부 null', async () => {
    const d = validDoc({}, {
      maxFreqHz: null, sensitivity: null, twistAmount: null,
      centerDeg: null, centerImage: null,
      dominantEar: null, earStrength: null,
      pitchMode: null, pitchIndex: null
    });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: register null', async () => {
    const d = validDoc({}, { register: null });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: seat null', async () => {
    const d = validDoc({ seat: null });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: name null', async () => {
    const d = validDoc({ name: null });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: lang en', async () => {
    const d = validDoc({ lang: 'en' });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: volDb 경계값 -60', async () => {
    const d = validDoc({}, { volDb: -60 });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: volDb 경계값 0', async () => {
    const d = validDoc({}, { volDb: 0 });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: lowDb/highDb 경계값 10.0', async () => {
    const d = validDoc({}, { lowDb: 10.0, highDb: -10.0 });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  await test('허용: seat 6', async () => {
    const d = validDoc({ seat: 6 });
    await assertSucceeds(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...d, createdAt: serverTimestamp()
    }));
  });

  // ===== 거부 케이스 =====

  await test('거부: earId 형식 불일치 (소문자 포함)', async () => {
    await assertFails(setDoc(doc(db, 'ears', 'abcde12345'), {
      ...validDoc({ earId: 'abcde12345' }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: earId 필드와 경로 불일치', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({ earId: 'ZZZZZ99999' }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: 알 수 없는 최상위 필드', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({ _extra: 'hack' }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: profile 안 알 수 없는 키', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({}, { _hack: true }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: name 너무 긺 (13자)', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({ name: '가나다라마바사아자차카' + '타' }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: hidden: true로 만들기', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({ hidden: true }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: volDb 범위 초과 (-61)', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({}, { volDb: -61 }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: lowDb 범위 초과 (11)', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({}, { lowDb: 11 }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: seat 범위 초과 (7)', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({ seat: 7 }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: lang 잘못된 값', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({ lang: 'jp' }), createdAt: serverTimestamp()
    }));
  });

  await test('거부: register 잘못된 값', async () => {
    await assertFails(setDoc(doc(db, 'ears', VALID_EAR_ID), {
      ...validDoc({}, { register: 'ULTRA' }), createdAt: serverTimestamp()
    }));
  });

  // update/delete 거부
  await test('거부: update 시도', async () => {
    // 에뮬레이터에 문서 먼저 생성
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'ears', VALID_EAR_ID), {
        ...validDoc(), createdAt: serverTimestamp()
      });
    });
    await assertFails(updateDoc(doc(db, 'ears', VALID_EAR_ID), { code: 'hacked' }));
  });

  await test('거부: delete 시도', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'ears', VALID_EAR_ID), {
        ...validDoc(), createdAt: serverTimestamp()
      });
    });
    await assertFails(deleteDoc(doc(db, 'ears', VALID_EAR_ID)));
  });

  await teardown();
  console.log(`\n규칙 테스트 완료: ${pass}개 통과, ${fail}개 실패`);
  if (fail > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
