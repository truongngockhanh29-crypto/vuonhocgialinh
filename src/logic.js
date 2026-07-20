/*
 * Logic thuần của trò chơi "Bé Vui Học".
 *
 * Tách khỏi index.html để kiểm thử độc lập (Vitest) và tái sử dụng. Module này
 * KHÔNG chạm DOM và KHÔNG đọc trạng thái toàn cục — cấp độ (level), chế độ (mode)
 * và trạng thái tập viết (write) đều truyền vào qua tham số. Phần ngẫu nhiên vẫn
 * dùng Math.random để test có thể mock (vi.spyOn).
 *
 * UMD: chạy được cả trên trình duyệt (window.GameLogic) lẫn Node/Vitest (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined') { window.GameLogic = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LETTERS = ['A','Ă','Â','B','C','D','Đ','E','Ê','G','H','I','K','L','M','N','O','Ô','Ơ','P','Q','R','S','T','U','Ư','V','X','Y'];
  const TILE_COLORS = ['#3FB6E8','#5FC77E','#FF7B54','#FFC93C','#B388EB','#FF6FA0','#4DD0C4','#F4A259'];

  // Mỗi chữ cái có 2 "thẻ": chữ HOA và chữ thường, để bé làm quen với cả hai dạng
  function buildAlphabetTokens(){
    const tokens = [];
    LETTERS.forEach(letter => {
      tokens.push({ key: letter + '-U', display: letter, base: letter });
      tokens.push({ key: letter + '-L', display: letter.toLowerCase(), base: letter });
    });
    return tokens;
  }
  const ALPHABET_TOKENS = buildAlphabetTokens();

  const COUNT_ITEMS = [
    { emoji: '🍎', name: 'quả táo' },
    { emoji: '🍌', name: 'quả chuối' },
    { emoji: '⭐', name: 'ngôi sao' },
    { emoji: '🐶', name: 'chú chó con' },
    { emoji: '🎈', name: 'quả bóng bay' },
    { emoji: '🦋', name: 'con bướm' },
    { emoji: '🌸', name: 'bông hoa' },
    { emoji: '🍓', name: 'quả dâu' },
  ];

  // Danh sách từ đơn giản để bé ghép chữ (đã bỏ dấu thanh, giữ nguyên các chữ cái đặc biệt ă/â/ê/ô/ơ/ư/đ)
  const WORDS = [
    { word: 'BA', emoji: '👨', label: 'ba' },
    { word: 'ME', emoji: '👩', label: 'mẹ' },
    { word: 'GA', emoji: '🐔', label: 'gà' },
    { word: 'BO', emoji: '🐮', label: 'bò' },
    { word: 'CA', emoji: '🐟', label: 'cá' },
    { word: 'XE', emoji: '🚗', label: 'xe' },
    { word: 'DE', emoji: '🐐', label: 'dê' },
    { word: 'MEO', emoji: '🐱', label: 'mèo' },
    { word: 'CHO', emoji: '🐶', label: 'chó' },
    { word: 'VIT', emoji: '🦆', label: 'vịt' },
    { word: 'ONG', emoji: '🐝', label: 'ong' },
    { word: 'HOA', emoji: '🌸', label: 'hoa' },
    { word: 'SAO', emoji: '⭐', label: 'sao' },
    { word: 'TAO', emoji: '🍎', label: 'táo' },
    { word: 'CAM', emoji: '🍊', label: 'cam' },
    { word: 'NHA', emoji: '🏠', label: 'nhà' },
    { word: 'CUA', emoji: '🦀', label: 'cua' },
    { word: 'CÂY', emoji: '🌳', label: 'cây' },
    { word: 'TÔM', emoji: '🦐', label: 'tôm' },
    { word: 'GÂU', emoji: '🐻', label: 'gấu' },
    { word: 'NGƯA', emoji: '🐴', label: 'ngựa' },
    { word: 'CHIM', emoji: '🐦', label: 'chim' },
  ];

  // Emoji dùng cho trò ghép cặp giống nhau
  const MEMORY_EMOJIS = ['🍎','🍌','🐶','🐱','⭐','🌸','🚗','🎈','🦋','🐝','🍊','🐟','🐮','🐔','🌳','🦆','🐐','🦀','🐻','🦐'];

  const NUMBERS_LIST = ['0','1','2','3','4','5','6','7','8','9'];

  // Âm (phonics) của từng chữ để đọc trong trò "Nghe âm chọn chữ".
  // Lưu ý: C/K cùng âm "cờ", I/Y cùng âm "i" — sẽ không cho xuất hiện chung một lượt.
  const LISTEN_SOUNDS = {
    'A':'a','Ă':'á','Â':'ớ','B':'bờ','C':'cờ','D':'dờ','Đ':'đờ','E':'e','Ê':'ê',
    'G':'gờ','H':'hờ','I':'i','K':'cờ','L':'lờ','M':'mờ','N':'nờ','O':'o','Ô':'ô',
    'Ơ':'ơ','P':'pờ','Q':'quờ','R':'rờ','S':'sờ','T':'tờ','U':'u','Ư':'ư','V':'vờ',
    'X':'xờ','Y':'i'
  };

  // ---------- ĐƯỜNG NÉT "NỐI CHỮ BẰNG ĐIỂM" ----------
  // Toạ độ trong ô 0..100 (x sang phải, y xuống dưới). Mỗi chữ gồm 1 hay nhiều
  // "nét" (mảng điểm); bé nối các điểm trong từng nét theo thứ tự đánh số.
  const CONNECT_BASE = {
    '0': [[[50,20],[65,28],[70,50],[65,72],[50,80],[35,72],[30,50],[35,28],[50,20]]],
    '1': [[[38,32],[52,20],[52,80]]],
    '2': [[[33,32],[50,20],[65,33],[55,52],[33,80],[67,80]]],
    '3': [[[35,28],[52,20],[64,33],[50,49],[64,64],[52,80],[34,72]]],
    '4': [[[62,20],[30,60],[72,60]],[[62,20],[62,80]]],
    '5': [[[64,20],[38,20],[35,46],[54,44],[64,60],[52,80],[33,73]]],
    '6': [[[62,24],[46,20],[35,40],[31,58],[36,74],[52,80],[64,70],[63,56],[50,49],[37,52]]],
    '7': [[[33,20],[68,20],[46,80]]],
    '8': [[[50,22],[60,28],[57,40],[43,40],[40,28],[50,22]],[[50,46],[63,55],[66,70],[50,80],[34,70],[37,55],[50,46]]],
    '9': [[[62,50],[47,53],[37,40],[45,23],[61,22],[68,40],[64,62],[52,80],[36,76]]],
    'A': [[[30,82],[50,18],[70,82]],[[38,56],[62,56]]],
    'B': [[[36,82],[36,18],[60,22],[65,37],[57,50],[36,50],[62,56],[68,70],[58,82],[36,82]]],
    'C': [[[68,30],[54,19],[38,26],[31,50],[38,74],[54,81],[68,70]]],
    'D': [[[36,18],[36,82],[58,76],[69,50],[58,24],[36,18]]],
    'E': [[[66,20],[35,20],[35,80],[66,80]],[[35,50],[58,50]]],
    'G': [[[68,30],[54,19],[38,26],[31,50],[38,74],[55,81],[68,70],[68,52],[54,52]]],
    'H': [[[35,18],[35,82]],[[65,18],[65,82]],[[35,50],[65,50]]],
    'I': [[[40,20],[60,20]],[[50,20],[50,80]],[[40,80],[60,80]]],
    'K': [[[35,18],[35,82]],[[66,18],[35,52]],[[44,46],[68,82]]],
    'L': [[[35,18],[35,80],[66,80]]],
    'M': [[[30,82],[30,18],[50,54],[70,18],[70,82]]],
    'N': [[[32,82],[32,18],[68,82],[68,18]]],
    'O': [[[50,18],[66,27],[71,50],[66,73],[50,82],[34,73],[29,50],[34,27],[50,18]]],
    'P': [[[36,82],[36,18],[60,22],[65,37],[58,51],[36,51]]],
    'Q': [[[50,18],[66,27],[71,50],[66,73],[50,82],[34,73],[29,50],[34,27],[50,18]],[[56,64],[72,86]]],
    'R': [[[36,82],[36,18],[60,22],[65,37],[58,51],[36,51]],[[46,51],[68,82]]],
    'S': [[[66,30],[52,19],[37,27],[42,45],[58,55],[63,69],[48,81],[33,71]]],
    'T': [[[30,20],[70,20]],[[50,20],[50,82]]],
    'U': [[[32,18],[32,62],[41,78],[50,81],[59,78],[68,62],[68,18]]],
    'V': [[[32,18],[50,82],[68,18]]],
    'X': [[[33,18],[67,82]],[[67,18],[33,82]]],
    'Y': [[[33,18],[50,52]],[[67,18],[50,52],[50,82]]]
  };
  // Dấu phụ (thêm 1 nét lên trên chữ gốc), đặt cao và giãn rộng cho thoáng.
  const CONNECT_MARKS = {
    breve: [[37,9],[50,17],[63,9]],             // ˘  (Ă)
    circ:  [[40,13],[50,3],[60,13]],            // ^  (Â Ê Ô)
    hornO: [[72,18],[84,9],[80,23]],            // móc (Ơ)
    hornU: [[72,12],[84,3],[80,17]],            // móc (Ư)
    dbar:  [[26,52],[45,52]]                     // gạch ngang (Đ)
  };
  const CONNECT_COMPOSED = {
    'Ă': ['A','breve'], 'Â': ['A','circ'], 'Ê': ['E','circ'],
    'Ô': ['O','circ'], 'Ơ': ['O','hornO'], 'Ư': ['U','hornU'], 'Đ': ['D','dbar']
  };

  // Chữ thường. Vùng: chân chữ (baseline) y78, đỉnh thân x-height y46,
  // nét nhô trên y16, nét thò xuống y94.
  const CONNECT_LOWER = {
    'a': [[[64,53],[52,46],[40,51],[35,63],[41,75],[55,77],[64,69]],[[64,47],[64,78]]],
    'b': [[[35,16],[35,78]],[[35,57],[47,51],[59,55],[64,65],[58,75],[45,78],[35,71]]],
    'c': [[[64,53],[52,46],[40,50],[35,62],[40,74],[52,78],[64,71]]],
    'd': [[[64,16],[64,78]],[[64,57],[52,51],[40,55],[35,65],[41,75],[53,78],[64,71]]],
    'e': [[[36,62],[64,62],[64,53],[52,46],[40,50],[35,62],[41,74],[55,78],[65,71]]],
    'g': [[[63,53],[51,46],[40,50],[36,60],[42,70],[54,72],[63,65]],[[63,47],[63,84],[55,93],[41,92]]],
    'h': [[[35,16],[35,78]],[[35,58],[46,51],[58,55],[62,66],[62,78]]],
    'i': [[[50,46],[50,78]],[[50,30]]],
    'k': [[[36,16],[36,78]],[[60,52],[36,66]],[[44,61],[62,78]]],
    'l': [[[50,16],[50,73],[58,78]]],
    'm': [[[33,50],[33,78]],[[33,56],[42,50],[50,56],[50,78]],[[50,56],[59,50],[67,56],[67,78]]],
    'n': [[[35,50],[35,78]],[[35,56],[45,50],[57,55],[62,66],[62,78]]],
    'o': [[[50,46],[61,50],[65,62],[61,74],[50,78],[39,74],[35,62],[39,50],[50,46]]],
    'p': [[[35,46],[35,94]],[[35,52],[47,46],[59,51],[64,62],[58,72],[46,74],[35,68]]],
    'q': [[[64,46],[64,94]],[[64,52],[52,46],[40,51],[35,62],[41,72],[53,74],[64,68]]],
    'r': [[[38,46],[38,78]],[[38,57],[48,49],[61,49]]],
    's': [[[63,52],[50,46],[39,50],[42,60],[57,66],[61,73],[49,78],[36,72]]],
    't': [[[46,30],[46,72],[55,78]],[[35,48],[60,48]]],
    'u': [[[35,46],[35,70],[45,77],[57,76],[64,68]],[[64,46],[64,78]]],
    'v': [[[35,46],[50,78],[65,46]]],
    'x': [[[36,46],[64,78]],[[64,46],[36,78]]],
    'y': [[[35,46],[50,76]],[[65,46],[50,76],[42,92],[30,93]]]
  };
  const CONNECT_LOWER_MARKS = {
    breve: [[38,24],[50,32],[62,24]],
    circ:  [[40,30],[50,20],[60,30]],
    hornO: [[64,44],[75,36],[72,48]],
    hornU: [[66,40],[77,32],[74,45]],
    dbar:  [[56,26],[73,26]]
  };
  const CONNECT_LOWER_COMPOSED = {
    'ă': ['a','breve'], 'â': ['a','circ'], 'ê': ['e','circ'],
    'ô': ['o','circ'], 'ơ': ['o','hornO'], 'ư': ['u','hornU'], 'đ': ['d','dbar']
  };

  function connectPathFor(value){
    // Chữ HOA & chữ số
    if(CONNECT_BASE[value]) return CONNECT_BASE[value];
    const up = CONNECT_COMPOSED[value];
    if(up){
      let base = CONNECT_BASE[up[0]] || [];
      // Dấu mũ/á đặt trên: nén thân chữ xuống chừa chỗ cho dấu.
      if(up[1] === 'circ' || up[1] === 'breve'){
        base = base.map(s => s.map(p => [p[0], 30 + (p[1] - 18) * 0.84]));
      }
      const mark = CONNECT_MARKS[up[1]];
      return mark ? base.concat([mark]) : base;
    }
    // Chữ thường (dấu đặt trong khoảng trống phía trên thân chữ, không cần nén)
    if(CONNECT_LOWER[value]) return CONNECT_LOWER[value];
    const lo = CONNECT_LOWER_COMPOSED[value];
    if(lo){
      const base = CONNECT_LOWER[lo[0]] || [];
      const mark = CONNECT_LOWER_MARKS[lo[1]];
      return mark ? base.concat([mark]) : base;
    }
    return null;
  }


  // ---------- HÀM THUẦN (tham số hoá theo level/mode/write) ----------
  function tileCountForLevel(level){
    return level === 1 ? 6 : level === 2 ? 9 : 12;
  }

  function numberRangeForLevel(level){
    return level === 1 ? 10 : level === 2 ? 20 : 30;
  }

  function randInt(max){ return Math.floor(Math.random()*max); }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = randInt(i+1);
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function buildPool(mode, level){
    if(mode === 'abc'){
      return shuffle(ALPHABET_TOKENS).slice(0, tileCountForLevel(level));
    } else {
      const max = numberRangeForLevel(level);
      const set = new Set();
      while(set.size < tileCountForLevel(level)){
        set.add(randInt(max+1));
      }
      return shuffle(Array.from(set)).map(n => ({ key: 'N' + n, display: String(n), base: n }));
    }
  }

  function listenSoundFor(letter){
    return LISTEN_SOUNDS[letter] || letter.toLowerCase();
  }

  function buildListenRound(level){
    const count = tileCountForLevel(level);
    const target = LETTERS[randInt(LETTERS.length)];
    const targetSound = listenSoundFor(target);
    const distractorPool = LETTERS.filter(l => l !== target && listenSoundFor(l) !== targetSound);
    const distractors = shuffle(distractorPool).slice(0, count - 1);
    const letters = shuffle([target, ...distractors]);
    const tokens = letters.map(l => ({ key: 'L-' + l, display: l, base: l, sound: listenSoundFor(l) }));
    return { tokens, target: tokens.find(t => t.base === target) };
  }

  function buildMathQuestion(level){
    const types = ['count', 'add', 'sub', 'compare'];
    const type = types[randInt(types.length)];

    if(type === 'count'){
      const max = level === 1 ? 5 : level === 2 ? 8 : 10;
      const n = 1 + randInt(max);
      const item = COUNT_ITEMS[randInt(COUNT_ITEMS.length)];
      return { type, correct: n, itemName: item.name, objects: Array(n).fill(item.emoji) };
    }
    if(type === 'add'){
      const max = level === 1 ? 5 : level === 2 ? 10 : 15;
      const a = randInt(max+1), b = randInt(max+1);
      return { type, correct: a+b, a, b, equation: `${a} + ${b} = ?` };
    }
    if(type === 'sub'){
      const max = level === 1 ? 5 : level === 2 ? 15 : 25;
      const a = randInt(max+1);
      const b = randInt(a+1);
      return { type, correct: a-b, a, b, equation: `${a} − ${b} = ?` };
    }
    // compare
    const max = level === 1 ? 10 : level === 2 ? 20 : 30;
    const a = randInt(max+1), b = randInt(max+1);
    const symbol = a > b ? '>' : a < b ? '<' : '=';
    return { type, correct: symbol, a, b, equation: `${a}   ?   ${b}` };
  }

  function buildNumericOptions(correct, level){
    const count = level === 1 ? 3 : level === 2 ? 4 : 5;
    const spread = level === 1 ? 3 : level === 2 ? 5 : 8;
    const options = new Set([correct]);
    let guard = 0;
    while(options.size < count && guard < 60){
      guard++;
      const delta = randInt(spread*2+1) - spread;
      const val = correct + delta;
      if(val >= 0) options.add(val);
    }
    let filler = 1;
    while(options.size < count){
      options.add(correct + filler);
      filler++;
    }
    return shuffle(Array.from(options)).map(n => ({ key: 'NUM-' + n, display: String(n), base: n }));
  }

  function buildMathOptions(question, level){
    let tokens;
    if(question.type === 'compare'){
      tokens = ['>', '<', '='].map(s => ({ key: 'SYM-' + s, display: s, base: s }));
    } else {
      tokens = buildNumericOptions(question.correct, level);
    }
    const correctToken = tokens.find(t => String(t.base) === String(question.correct));
    return { tokens, correctToken };
  }

  function buildWordQuestion(level){
    const maxLen = level === 1 ? 2 : level === 2 ? 3 : 4;
    const minLen = level === 1 ? 2 : 3;
    const candidates = WORDS.filter(w => w.word.length >= minLen && w.word.length <= maxLen);
    const pool = candidates.length ? candidates : WORDS;
    const pick = pool[randInt(pool.length)];
    const letters = pick.word.split('');
    const distractorCount = level === 1 ? 0 : level === 2 ? 1 : 2;
    const wordLetterSet = new Set(letters);
    const distractorPool = LETTERS.filter(l => !wordLetterSet.has(l));
    const distractors = shuffle(distractorPool).slice(0, distractorCount);
    const tileLetters = shuffle([...letters, ...distractors]);
    const tiles = tileLetters.map((l, i) => ({ key: 'WL-' + i + '-' + l, letter: l, display: l }));
    return { word: pick.word, emoji: pick.emoji, label: pick.label, tiles };
  }

  function buildMemoryBoard(level){
    const pairsCount = level === 1 ? 6 : level === 2 ? 8 : 10;
    const chosen = shuffle(MEMORY_EMOJIS).slice(0, pairsCount);
    return shuffle([...chosen, ...chosen]).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
  }

  function formatDuration(ms){
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // write = { source: 'abc'|'num', index, case: 'upper'|'lower' }
  function getWriteValue(write){
    if(write.source === 'abc'){
      const letter = LETTERS[write.index % LETTERS.length];
      return write.case === 'lower' ? letter.toLowerCase() : letter;
    }
    return NUMBERS_LIST[write.index % NUMBERS_LIST.length];
  }

  function writeLabelText(write){
    if(write.source === 'num') return 'số';
    return write.case === 'lower' ? 'chữ thường' : 'chữ HOA';
  }

  function wrapIndex(newIndex, len){
    return ((newIndex % len) + len) % len;
  }

  return {
    LETTERS, TILE_COLORS, COUNT_ITEMS, WORDS, MEMORY_EMOJIS, NUMBERS_LIST,
    LISTEN_SOUNDS, ALPHABET_TOKENS,
    buildAlphabetTokens, connectPathFor,
    tileCountForLevel, numberRangeForLevel, randInt, shuffle,
    buildPool, listenSoundFor, buildListenRound, buildMathQuestion,
    buildNumericOptions, buildMathOptions, buildWordQuestion, buildMemoryBoard,
    formatDuration, getWriteValue, writeLabelText, wrapIndex,
  };
});
