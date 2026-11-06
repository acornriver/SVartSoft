/**
 * 청각 다변기 (Sound Variator) - 화면 문구 (한국어 / English)
 *
 * 모든 안내 문구를 여기 한곳에 키로 모읍니다. 화면은 t('키')로만 문구를 가져옵니다.
 * - 말투: 차민휘 지시문의 존댓말 안내 (11/05부터. 예전의 달팽이 반말은 없앰)
 * - 음성 안내 자막은 VOICE_COPY에 번호로 모으고, 그 번호가 곧 media/voice의 파일 번호입니다.
 */

const LANGS = ['ko', 'en'];

// 단계 이름 (안내는 VOICE_COPY의 음성·자막)
const STAGE_COPY = {
  PART1_VOLUME: { ko: { title: '편한 크기' }, en: { title: 'Comfortable volume' } },
  PART1_LOW: { ko: { title: '낮은 소리 주무르기' }, en: { title: 'Knead the lows' } },
  PART1_HIGH: { ko: { title: '높은 소리 주무르기' }, en: { title: 'Knead the highs' } },
  PART1_REGISTER: { ko: { title: '어디가 튀어나올까요?' }, en: { title: 'Where should it pop out?' } },
  PART2_SENSITIVITY: { ko: { title: '어디까지 들리나요?' }, en: { title: 'How high can you hear?' } },
  PART2_CENTER: { ko: { title: '가운데는 어디인가요?' }, en: { title: 'Where is the middle?' } },
  PART2_EAR: { ko: { title: '높은 음은 어느 쪽인가요?' }, en: { title: 'Where is the high note?' } },
  PART2_PITCH: { ko: { title: '올라갔나요? 내려갔나요?' }, en: { title: 'Up or down?' } }
};

// 음성 안내의 자막 (차민휘 지시문, media/voice 파일과 번호가 같음). 재생 시점은 part1_audio.js · part2_audio.js
// 끝까지 달팽이를 숨기려고 고친 줄은 VOICE_PENDING에 적음
const VOICE_COPY = {
  '1-1': { ko: '손가락으로 화면을 위로 쓸어 올려보세요.', en: 'Swipe up on the screen with your finger.' },
  '1-2': { ko: '덩어리가 쭉 늘어나요.', en: 'Watch the lump stretch.' },
  '1-3': { ko: '아래로 쓸어 내리면 덩어리가 줄어들어요.', en: 'Swipe down to make it shrink.' },
  '1-4': { ko: '소리도 함께 커지고 작아지는 걸 들어보세요.', en: 'Listen as the sound gets louder and softer, too.' },
  '1-5': { ko: '편안하게 들리면 덩어리를 길게 눌러주세요.', en: 'When the sound feels comfortable, press and hold the lump.' },
  '1-6': { ko: '선택하신 소리에 맞춰 덩어리의 크기가 정해졌어요.', en: 'The lump’s size is now set to match the sound you chose.' },
  '2-1': { ko: '이제 덩어리를 조금씩 주물러볼게요.', en: 'Now, let’s knead the lump, little by little.' },
  '2-2': { ko: '이번에는 낮은 소리가 편안하게 들리도록 주물러볼게요.', en: 'This time, knead it until the low sounds feel comfortable.' },
  '2-3': { ko: '손가락으로 화면을 위아래로 쓸며 소리의 변화를 들어보세요.', en: 'Swipe up and down on the screen with your finger, and listen to how the sound changes.' },
  '2-4': { ko: '가장 편안하게 들리는 소리를 찾으셨다면, 덩어리를 길게 눌러주세요.', en: 'Once you find the sound that feels most comfortable, press and hold the lump.' },
  '2-5': { ko: '선택하신 소리에 맞춰 낮은 소리가 정해졌어요.', en: 'The low sounds are now set to match your choice.' },
  '3-1': { ko: '이번에는 높은 소리를 주물러볼게요.', en: 'Now, let’s knead the high sounds.' },
  '3-2': { ko: '손가락으로 화면을 위아래로 쓸며 소리의 변화를 들어보세요.', en: 'Swipe up and down on the screen with your finger, and listen to how the sound changes.' },
  '3-3': { ko: '가장 편안하게 들리는 소리를 찾아보세요.', en: 'Find the sound that feels most comfortable to you.' },
  '3-4': { ko: '편안하게 들리면 덩어리를 길게 눌러주세요.', en: 'When the sound feels comfortable, press and hold the lump.' },
  '3-5': { ko: '선택하신 소리에 맞춰 높은 소리가 정해졌어요.', en: 'The high sounds are now set to match your choice.' },
  '4-1': { ko: '이제 덩어리에서 튀어나올 자리를 정해볼게요.', en: 'Now, let’s choose where the lump will pop out.' },
  '4-2': { ko: '같은 멜로디를 세 가지 소리로 들려드릴게요.', en: 'You’ll hear the same melody played with three different sounds.' },
  '4-3': { ko: '소리가 나오는 동안 표시되는 자리를 함께 살펴보세요.', en: 'As each sound plays, look at the position marked on the screen.' },
  '4-4': { ko: '세 자리를 하나씩 눌러 멜로디를 다시 들어보세요.', en: 'Tap each of the three positions to hear the melody again.' },
  '4-5': { ko: '가장 편안하게 들리는 자리를 고른 뒤, 덩어리를 길게 눌러주세요.', en: 'Choose the position where the sound feels most comfortable, then press and hold the lump.' },
  '4-6': { ko: '선택하신 소리에 맞춰 튀어나온 자리가 정해졌어요.', en: 'The spot that popped out is now set to match your choice.' },
  '4-7': { ko: '덩어리를 짧게 누르면 세 가지 소리를 다시 들을 수 있어요.', en: 'Tap the lump to hear the three sounds again.' },
  '4-8': { ko: '세 가지 소리를 차례로 다시 들려드릴게요.', en: 'You’ll hear the three sounds again, one at a time.' },
  '5-1': { ko: '이번에는 소리가 언제 사라지는지 들어볼게요.', en: 'This time, listen for the moment the sound disappears.' },
  '5-2': { ko: '소리가 더 이상 들리지 않을 때, 화면 아무 곳이나 한 번 눌러주세요.', en: 'When you can no longer hear the sound, tap anywhere on the screen once.' },
  '5-3': { ko: '한 번 더 들어보시려면 덩어리를 짧게 눌러주세요.', en: 'To listen again, tap the lump.' },
  '5-4': { ko: '다음으로 넘어가려면 덩어리를 길게 눌러주세요.', en: 'To continue, press and hold the lump.' },
  '5-5': { ko: '소리를 듣는 동안 선이 돌돌 말렸어요.', en: 'As you listened, the line coiled up.' },
  '5-6': { ko: '같은 방법으로 한 번 더 들어볼게요.', en: 'Let’s listen once more in the same way.' },
  '5-7': { ko: '아직 소리가 시작되기 전이에요.', en: 'The sound hasn’t started yet.' },
  '5-8': { ko: '덩어리를 짧게 눌러 다시 들어보세요.', en: 'Tap the lump to listen again.' },
  '6-1': { ko: '이번에는 소리가 가운데에서 들리도록 맞춰볼게요.', en: 'This time, let’s adjust the sound so you hear it in the center.' },
  '6-2': { ko: '손가락으로 화면을 왼쪽이나 오른쪽으로 쓸어보세요.', en: 'Swipe left or right on the screen with your finger.' },
  '6-3': { ko: '소리가 가운데에서 들리면, 덩어리를 길게 눌러주세요.', en: 'When you hear the sound in the center, press and hold the lump.' },
  '6-4': { ko: '한 번 더 가운데를 찾아볼게요.', en: 'Let’s find the center once more.' },
  '6-5': { ko: '선의 색이 정해졌어요.', en: 'The color of the line is now set.' },
  '7-1': { ko: '이번에는 소리가 들리는 방향을 찾아볼게요.', en: 'This time, let’s find which side the sound is coming from.' },
  '7-2': { ko: '방금 들은 소리가 어느 쪽 귀에서 들리는지 들어보세요.', en: 'Notice which ear you heard the sound in.' },
  '7-3': { ko: '높은 음이 들린 쪽으로 덩어리를 밀어주세요.', en: 'Slide the lump toward the side where you heard the higher note.' },
  '7-4': { ko: '손을 떼면 선택이 완료돼요.', en: 'Lift your finger to confirm your choice.' },
  '7-5': { ko: '세 번 진행할게요.', en: 'We’ll do this three times.' },
  '7-6': { ko: '높은 음이 들리는 쪽이 정해졌어요.', en: 'The side of the higher note is now set.' },
  '8-1': { ko: '마지막으로, 두 소리를 듣고 덩어리를 움직여볼게요.', en: 'Finally, let’s listen to two sounds and move the lump.' },
  '8-2': { ko: '뒤의 소리가 앞의 소리보다 올라가는 느낌이면, 덩어리를 오른쪽으로 밀어주세요.', en: 'If the second sound seems to go up from the first, slide the lump to the right.' },
  '8-3': { ko: '내려가는 느낌이면, 왼쪽으로 밀어주세요.', en: 'If it seems to go down, slide the lump to the left.' },
  '8-4': { ko: '손을 떼면 선택이 완료돼요.', en: 'Lift your finger to confirm your choice.' },
  '8-5': { ko: '여섯 번 진행할게요.', en: 'We’ll do this six times.' },
  '8-6': { ko: '이제 모든 소리를 다 골랐어요.', en: 'You’ve now chosen all the sounds.' },
  '9-1': { ko: '지금까지 고른 소리가 모여, 한 마리의 달팽이가 완성됐어요.', en: 'All the sounds you’ve chosen have come together, and your snail is now complete.' }
};

// 문구를 고쳐서 재녹음을 기다리는 줄. 녹음이 오면 media/voice 파일을 바꾸고 여기서 지움. 그 전까지는 소리 없이 자막만 나옴
const VOICE_PENDING = {
  ko: ['1-2', '1-3', '1-5', '1-6', '2-1', '2-2', '2-4', '2-5', '3-1', '3-4', '3-5', '4-1', '4-5', '4-6', '4-7', '5-3', '5-4', '5-5', '5-8', '6-3', '6-5', '7-3', '7-6', '8-1', '8-2', '8-6'],
  en: ['1-2', '1-3', '1-5', '1-6', '2-1', '2-2', '2-4', '2-5', '3-1', '3-4', '3-5', '4-1', '4-5', '4-6', '4-7', '5-3', '5-4', '5-5', '5-8', '6-3', '6-5', '7-3', '7-6', '8-1', '8-2', '8-3', '8-6']
};

const COPY = {
  ko: {
    'intro.before': '모든 귀는 ',
    'intro.after': ' 이다',
    'intro.placeholder': '이름',
    'intro.headphones': '헤드폰을 착용해주세요.',
    'intro.name': '괄호 안에 이름을 입력해주세요.',
    'intro.done': '입력을 마치면 키보드의 완료를 눌러주세요.',
    'intro.voice': '음성 안내',

    'hint.listening': '잘 들어보세요…',
    'hint.result1': '화면을 누르고 있는 동안은 원래 소리',
    'hint.result2': '달팽이를 오른쪽으로 밀면 청감타워로 가요',


    'axis.low': '낮은 소리',
    'axis.high': '높은 소리',
    'ear.L': '왼쪽',
    'ear.R': '오른쪽',
    'pitch.L': '내려갔어요',
    'pitch.R': '올라갔어요',
    'center.L': '왼쪽으로 치우친 가운데',
    'center.C': '한가운데',
    'center.R': '오른쪽으로 치우친 가운데',
    'side.L': '왼쪽 귀',
    'side.R': '오른쪽 귀',

    'result.before': '모든 귀는 ',
    'result.after': ' 이다',
    'result.original': '원래 소리를 듣는 중',
    'tour.line': '이 귀로 북서울미술관 주변을 걸어 볼게요',
    'tour.now': '지금 걷는 곳',
    'place.water': '당현천',
    'place.walk-stair': '중계역 계단',
    'place.train-go': '중계역 지하철',
    'place.car-move': '북서울미술관 앞',
    'sent.title': '청감타워로 갔어요',
    'sent.sub': '다음 귀를 기다릴게요',
    'word.low': '저음',
    'word.high': '고음',
    'row.volume': '크기',
    'row.low': '꼬리 · 저음',
    'row.high': '머리 · 고음',
    'row.register': '껍질 · 음역',
    'row.hearing': '꼬임 · 들리는 높이',
    'row.pan': '색 · 가운데',
    'row.ear': '우세 귀',
    'row.pitch': '껍질 모양 · 바탕음/배음',
    'register.LOW': '저음역',
    'register.MID': '중음역',
    'register.HIGH': '고음역',
    'pitch.F': '바탕음 귀',
    'pitch.B': '두 귀',
    'pitch.H': '배음 귀',
    'khz': (k) => `${k} kHz까지`,
    'lowWords': ['얇게', '조금 얇게', '그대로', '조금 웅웅', '웅웅'],
    'highWords': ['보들', '조금 보들', '그대로', '조금 쨍', '쨍']
  },
  en: {
    'intro.before': 'Every ear is ',
    'intro.after': '',
    'intro.placeholder': 'name',
    'intro.headphones': 'Please put on your headphones.',
    'intro.name': 'Please enter your name inside the brackets.',
    'intro.done': 'When you’re finished, tap Done on the keyboard.',
    'intro.voice': 'Voice guide',

    'hint.listening': 'Listen…',
    'hint.result1': 'Hold the screen to hear the original',
    'hint.result2': 'Push the snail to the right to send it to the Hearing Tower',


    'axis.low': 'low',
    'axis.high': 'high',
    'ear.L': 'Left',
    'ear.R': 'Right',
    'pitch.L': 'Down',
    'pitch.R': 'Up',
    'center.L': 'Middle, leaning left',
    'center.C': 'Right in the middle',
    'center.R': 'Middle, leaning right',
    'side.L': 'Left ear',
    'side.R': 'Right ear',

    'result.before': 'Every ear is ',
    'result.after': '',
    'result.original': 'Playing the original',
    'tour.line': 'Let’s walk around the Buk-Seoul Museum of Art with these ears',
    'tour.now': 'Now walking',
    'place.water': 'Danghyeoncheon Stream',
    'place.walk-stair': 'Junggye Station stairs',
    'place.train-go': 'Junggye Station subway',
    'place.car-move': 'In front of Buk-Seoul Museum of Art',
    'sent.title': 'Off to the Hearing Tower',
    'sent.sub': 'Waiting for the next ear',
    'word.low': 'low',
    'word.high': 'high',
    'row.volume': 'Size',
    'row.low': 'Tail · low',
    'row.high': 'Head · high',
    'row.register': 'Shell · register',
    'row.hearing': 'Twist · highest heard',
    'row.pan': 'Color · middle',
    'row.ear': 'Leading ear',
    'row.pitch': 'Shell shape · pitch',
    'register.LOW': 'Low',
    'register.MID': 'Mid',
    'register.HIGH': 'High',
    'pitch.F': 'Fundamental ear',
    'pitch.B': 'Both ears',
    'pitch.H': 'Overtone ear',
    'khz': (k) => `up to ${k} kHz`,
    'lowWords': ['thin', 'a bit thin', 'as is', 'a bit warm', 'warm'],
    'highWords': ['velvet', 'a bit velvet', 'as is', 'a bit shiny', 'shiny']
  }
};

function currentLang() {
  return window.GlobalState.lang;
}

/** 키 → 지금 언어의 문구. 없으면 한국어, 그래도 없으면 키 그대로 */
function t(key) {
  const lang = currentLang();
  const v = COPY[lang][key] !== undefined ? COPY[lang][key] : COPY.ko[key];
  return v !== undefined ? v : key;
}

// 음성 안내 번호 → 지금 언어의 자막
function voiceText(id) {
  return VOICE_COPY[id][currentLang()];
}

function stageCopy(stage) {
  const c = STAGE_COPY[stage];
  return c ? c[currentLang()] || c.ko : null;
}
