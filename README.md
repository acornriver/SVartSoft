# 🎧 청각 다변기 (Sound Variator) — 모든 귀는 [ ] 이다
> **2026 서울시립 북서울미술관 전시 사운드 프로젝트**  
> **이름 입력 → Part 1 선호 EQ 네 검사 → Part 2 네 검사(임시) → 달팽이와 청감 코드**  
> 🔗 **웹 데모**: [https://acornriver.github.io/SVartSoft/](https://acornriver.github.io/SVartSoft/) (두 번째 링크 버전. 첫 번째 링크는 [SVart](https://acornriver.github.io/SVart/))

관람객이 소파에 앉아 아이패드를 손에 들고 무선 헤드폰으로 참여합니다.  
**한 단계에 한 파트만** 들려주고 **한 축만** 조절해 개인 선호 EQ를 만듭니다. 결과 EQ는 세 작가의 곡에 적용됩니다(곡이 오기 전까지는 북서울 사운드스케이프 3개). 아이패드에서 p5.js + p5.sound로 실행합니다.

---

## 📌 진행 흐름

첫 화면 "모든 귀는 [   ] 이다"(English: "Every ear is [   ]")에서 오른쪽 위의 **확성기와 한국어 / English**를 고르고, [ ] 안에 이름을 쓴 뒤 완료(Enter)를 누릅니다.
검정 바탕에 흰 선 하나로 그린 이름 없는 덩어리를 검사 내내 주무릅니다. 가로축은 음고라서 **왼쪽이 낮은 소리, 오른쪽이 높은 소리**입니다. 결과 화면에서 덩어리가 달팽이로 바뀝니다.

| 단계 | 들려주는 소리 | 관람객이 하는 일 | 결과값 | 화면에서 |
| :--- | :--- | :--- | :--- | :--- |
| **① 편한 크기** | 비트 전체 | 위아래로 쓸기 | `masterVolume` | 덩어리가 부풀거나 줄어듦 |
| **② 낮은 소리** | 킥·베이스가 큰 비트 | 위아래로 쓸기 | `lowShelf` (200Hz, ±10dB) | 왼쪽 아래가 부풀거나 눌림 (달팽이의 꼬리) |
| **③ 높은 소리** | 하이햇·쉐이커가 큰 비트 | 위아래로 쓸기 | `highShelf` (4kHz, ±10dB) | 오른쪽 위가 부풀거나 눌림 (달팽이의 머리) |
| **④ 튀어나올 자리 (음역)** | 같은 멜로디를 저(C2)/중(C4)/고(C6)로 (듣는 순서 B-A-C 고정) | 위쪽 A/B/C 톡 | `registerPeak` (100Hz / 400Hz / 2.5kHz, +3dB, Q 1) | 고른 자리의 몸이 튀어나옴. 껍질은 결과 화면에서 처음 나옴 |
| **⑤ 고역 예민도** | 8→16 kHz로 높아지며 작아지는 삐 소리 (한 번, 모두 3번까지) | 안 들리게 되는 순간 화면 아무 데나 톡. 덩어리 톡 = 한 번 더, 꾹 = 다음 | `maxFreqHz`, `sensitivity`, `twist` | 선이 이중나선으로 꼬이고 톡 한 순간의 꼬임이 남음 |
| **⑥ 중앙** | 68번 귀 HRIR 비트 (2번) | 좌우로 쓸어 가운데로 맞춘 뒤 덩어리 꾹 | `centerDeg`, `centerImage` (L/C/R) | 치우침에 따라 선 색이 정해짐 |
| **⑦ 우세 귀** | 옥타브 착청 (Deutsch 1974, 3번) | 높은 음이 들린 쪽으로 덩어리를 밀고 손 떼기 | `dominantEar`, `earStrength` | 결과 화면의 껍질 모양 (왼쪽 네모, 오른쪽 동그라미) |
| **⑧ 바탕음·배음** | 바탕음 없는 복합음 두 개 (듣기만 하는 예시 + 6번) | 올라갔으면 오른쪽, 내려갔으면 왼쪽으로 밀고 손 떼기 | `pitchMode` (F/B/H), `pitchIndex` | 청감 코드에만 나타남 |
| **결과: 북서울 산책** | 개인 EQ를 입힌 녹음 3곡(당현천 → 중계역 지하철 → 북서울미술관 앞). 15초씩 돌아가고, 버튼으로 고르면 그 곡에 고정 | 곡 버튼, 원래 소리 ↔ 내 귀 EQ 슬라이더, 달팽이를 오른쪽으로 밀어 보내기 | 청감 코드 `IwS/6 · RLF 13.2` | 달팽이로 바뀌며 껍질이 나와 합쳐지고, 뒤에 장소 영상(고대비 흑백) |

- **조작**: 버튼은 첫 화면의 확성기·언어, 검사 화면의 음성 크기 슬라이더, 결과 화면의 곡 버튼·EQ 슬라이더뿐입니다. 확정은 덩어리를 꾹 누르기(0.9초, 손끝에 빨간 고리), 다시 듣기는 덩어리 톡입니다. 결과 화면 빈 곳을 누르고 있는 동안에도 원래 소리가 납니다. 2분 동안 아무도 안 만지면 첫 화면으로 돌아갑니다.
- **쓸기 방향**: ①②③은 위아래로, ⑥⑦⑧과 달팽이 밀기는 좌우로 쓸 때만 동작합니다. 처음 움직인 방향으로 정하고 대각선은 무시합니다.
- **음성 안내와 잠금**: 음성이 나오는 동안 위에 자막이 나옵니다. 할 일을 알려 주는 안내와 듣기만 하는 예시가 나오는 동안은 터치를 받지 않고, 풀린 뒤 새로 시작한 터치부터 반영합니다. 재녹음 전인 줄(`VOICE_PENDING`)은 자막만 나오고 비트도 줄이지 않습니다.
- **비트**(`beat.js`): p5.sound의 오디오 컨텍스트 위에서 Web Audio로 직접 합성합니다. 120 BPM, 2마디 반복이고, 시작할 때 직접 재서 K-가중 −26 dB로 맞춥니다. ④ 멜로디와 Part 2 소리에는 비트 묶음을 쓰지 않습니다.
- **Part 2 네 검사**(`part2_audio.js`): `ref/part2 (1).html`의 검사 설계·소리·채점을 옮기고, 답하는 방식만 이 앱의 손짓으로 바꿨습니다. 소리 크기는 ① 볼륨과 무관한 고정값(명목 dB SPL)이라 `part2Bus`로 바로 출력합니다.
- **청감타워로 보내기**: 달팽이를 밀면 결과를 Firestore로 보내고(`cloud/send.js`, 인터넷이 없으면 대기열에서 재시도), 달팽이가 오른쪽으로 기어 나간 뒤 첫 화면으로 돌아갑니다. Firebase 프로젝트 설정 전에는 실제로 보내지 않습니다(`cloud/SETUP.md`). 결과는 `window.EAR_RESULT`와 `localStorage['svart.earProfile']`에도 남깁니다.
- **청감 코드**: `[음역][저음][고음]/[음량] · [가운데][우세귀][바탕음·배음] [가청 kHz]` (`earCode.js`). 글자 이름은 미확정입니다.
- **문구와 음성**: 모두 `copy.js`에 한국어/영어로 모여 있습니다. 음성 안내(`voice.js`, `media/voice/`)와 자막은 차민휘 지시문의 존댓말을 따르고, `VOICE_COPY`의 번호가 곧 파일 번호입니다.

### 측정 원칙
- **한 축만**: ①②③은 화면을 위아래로 쓸어서만 조절합니다. 위로 쓸면 커지거나 많아지고, 아래로 쓸면 줄어듭니다. 손가락 위치가 아니라 쓴 거리만큼 바뀌는 상대 조작이라 무작위 시작값이 유지됩니다.
- **시작값 무작위**: 처음 놓인 자리에 끌려가지 않도록 매 단계 시작값을 무작위로 둡니다.
- **꾹으로 확정**: 충분히 움직이고 확정 안내를 들은 뒤에만 덩어리 꾹이 됩니다.
- **음량 자동 보정**: EQ를 바꿔도 체감 음량(A-가중 파워)이 같도록 보정합니다. 큰 소리를 더 좋다고 고르는 편향을 막기 위해서입니다.
- **숫자는 숨김**: 조절 중에는 dB 값이나 눈금 숫자를 보여주지 않습니다. 값은 우상단에 작은 디버그 숫자로만 표시합니다. 다만 덩어리 모양은 EQ를 따라 바뀌므로, 관람객이 귀 대신 '매끈한 모양'에 맞추는지 실기 테스트에서 지켜봐야 합니다.
- **④ 강제 선택**: 세 음역은 A/B/C로만 표시하고 "모르겠다"는 선택지가 없습니다. x축이 음고라 자리는 낮은 음역부터 왼쪽→오른쪽으로 고정이고, 처음 들려주는 순서는 B-A-C로 고정입니다.

### 비주얼 (오디오비주얼, 고대비)
- 검정 바탕, 흰 선, 포인트 색은 신호 빨강(#ff3b1f) 하나입니다.
- 덩어리 윤곽은 지금 들리는 소리의 파형입니다(오실로스코프처럼, `p5.FFT.waveform()`). 파형 크기는 고른 볼륨으로 나눠 늘 비슷하게 보입니다.
- ①②③에서는 비트를 탑니다. 킥에 몸이 눌리고 선이 굵어지며 화면 전체에 아주 옅은 섬광이 납니다. 스네어에는 몸 위로 흰 선이 튑니다.
- 결과 화면에서 덩어리가 달팽이로 바뀝니다. 더듬이가 자라고 껍질이 나오며, 곡을 들을 때 고개를 까딱이고 더듬이로 음파 고리를 받습니다.
- 결과 화면에만 장소 영상을 캔버스 뒤에 깝니다(흑백, contrast 2.4). 영상은 시작할 때 blob으로 받아 두고, 1초마다 멈췄는지 확인해 다시 재생합니다.

---

## 📂 파일 구조

```
SVartSoft/
├── index.html            # 뷰포트 고정, 제스처 차단 CSS, 폰트, 스크립트 로드
├── lib/                  # p5.js 1.9.4, p5.sound, 폰트 (인터넷 CDN 없이 뜨도록 레포에 둠)
├── globalState.js        # 전역 상태 객체 (window.GlobalState)
├── copy.js               # 화면 문구와 음성 자막 (한국어 / English)
├── earCode.js            # 청감 코드 만들기·읽기
├── voice.js              # 음성 안내 재생, 자막, 안내 잠금
├── loudness.js           # K-가중 크기와 스펙트럼 재기
├── beat.js               # ①②③ 검사용 비트
├── tour.js               # 결과: 북서울 산책(녹음 + 흑백 영상) · 청감타워로 보내기
├── part1_audio.js        # 전체 단계 진행, 소스 전환, 개인 EQ 체인, 음량 보정, ④ 멜로디, 쓸기
├── part2_audio.js        # Part 2 검사 네 개
├── visuals.js            # 첫 화면, 파형 덩어리·달팽이 비주얼, 단계별 화면, 터치 영역
├── main.js               # p5 생명주기, 손짓 해석, 방치 리셋
├── dev.js                # 개발용 이동 버튼 (?dev=1, 최종본에서 삭제)
├── cloud/                # 청감타워 Firebase 모듈 (설정은 cloud/SETUP.md)
├── firestore.rules       # Firestore 보안 규칙
├── tests/e2e/            # 헤드리스 크롬 전체 흐름·멈춤 복구 테스트
├── tests/cloud/          # 규칙·단위 테스트
├── tests/register/       # ④ 음역 음량 보정 도구
└── tests/earcode/        # 청감 코드 글자별 EQ 들어 보기
```

신호 흐름:

```
비트(①②③) · 북서울 녹음(결과) → lowShelf → registerPeak → highShelf → loudnessComp → masterGain → duckGain → 출력
멜로디(④)  ───────────────────────────────────────────────────────→ masterGain
Part 2 소리 ────────────── part2Bus (① 볼륨과 무관한 고정 크기) ───→ 출력
음성 안내  ──────────────────────────────────────────────────────→ 출력
```

- 작가 곡을 넣을 때는 `GlobalState.audioNodes.eqChainInput`에 연결하면 개인 EQ가 적용됩니다.

---

## 🎛️ 전역 상태 규격 (`globalState.js`)

```javascript
window.GlobalState = {
  // 'INIT' | 'NAMED' | 'PART1_VOLUME' | 'PART1_LOW' | 'PART1_HIGH' | 'PART1_REGISTER'
  // | 'PART2_SENSITIVITY' | 'PART2_CENTER' | 'PART2_EAR' | 'PART2_PITCH' | 'RESULT'
  currentStage: 'INIT',
  isAudioInitialized: false,
  userName: '',
  lang: 'ko',               // 'ko' | 'en'

  part1: {
    stepIndex: 0,            // FLOW_STAGES 안의 위치
    control: 0.5,            // 현재 단계 조절값 0.0 ~ 1.0
    hasMoved: false,         // 확정 가능 여부
    register: { order: [], playOrder: [], playingCard: -1, selectedCard: -1, isAutoPlaying: false },
    isBypassed: false,       // 결과 단계에서 원래 소리 쪽 (eqMix < 0.5)
    eqMix: 1                 // 결과 단계 슬라이더: 0 원래 소리 ~ 1 내 귀 EQ
  },

  userEQProfile: {
    masterVolume: 0.5,
    lowShelf: { freq: 200, gain: 0 },
    highShelf: { freq: 4000, gain: 0 },
    registerPeak: { register: null, freq: 400, gain: 0, q: 1 }
  },

  psychoProfile: {
    maxFreqHz: null, sensitivity: null, twist: null,
    centerDeg: null, centerImage: null,
    dominantEar: null, earStrength: null,
    pitchMode: null, pitchIndex: null,
    raw: { sensitivity: null, center: null, octave: null, f0: null }
  },
  audioNodes: { fft: null, amplitude: null, eqChainInput: null, masterGain: null }
};
```

---

## 🎵 결과 화면 곡 바꾸기

`tour.js` 맨 위의 `TOUR_PLACES`에 `key`, `audio`, `video`를 적고 `copy.js`에 `place.<key>` 이름을 넣습니다. 불러올 때 K-가중 −26 dB로 맞추고 스펙트럼을 재서 음량 보정에 씁니다. 녹음을 못 받으면 다시 시도하고, 받기 전까지 그 곡은 영상만 나옵니다.

---

## 🔧 실기기 보정

1. **④ 음역별 음량**: `tests/register/`를 아이패드와 헤드폰으로 열고 `[보정]` 패널에서 세 음역이 같은 크기로 들리게 맞춥니다. 같은 기기에서는 본 앱이 그 값을 자동으로 읽어 씁니다(`localStorage`). 확정된 값은 `REGISTERS`의 `defaultOffsetDb`에 옮겨 적어주세요.
2. **쓸기 감도**: 너무 예민하거나 둔하면 `part1_audio.js`의 `PART1_ADJUST`에서 `span`(화면 높이만큼 쓸었을 때 바뀌는 dB)을 조절합니다.

---

## 🚀 로컬 실행 & 배포

```bash
python3 -m http.server 8080   # http://localhost:8080
```

- PC에서는 마우스를 누른 채 끌면 쓸기와 같습니다(Part 1 위아래, Part 2 좌우). 이름은 키보드로 쓰고 Enter를 누릅니다.
- 실기기 테스트는 GitHub Pages([https://acornriver.github.io/SVartSoft/](https://acornriver.github.io/SVartSoft/))로 합니다.
