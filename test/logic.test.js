import { describe, it, expect, vi, afterEach } from 'vitest';
import G from '../src/logic.js';

const {
  LETTERS, WORDS, MEMORY_EMOJIS, NUMBERS_LIST, LISTEN_SOUNDS,
  tileCountForLevel, numberRangeForLevel,
  shuffle, buildPool, buildListenRound, buildMathQuestion, buildNumericOptions,
  buildMathOptions, buildWordQuestion, buildMemoryBoard, connectPathFor,
  formatDuration, getWriteValue, writeLabelText, wrapIndex,
} = G;

// Cấu hình độ khó kỳ vọng theo từng cấp — mirror các ternary trong logic,
// vừa dùng để kiểm thử vừa như một bản đặc tả rõ ràng.
const CFG = {
  1: { tiles: 6,  numberRange: 10, countMax: 5,  addMax: 5,  subMax: 5,  compareMax: 10, optionCount: 3, optionSpread: 3, wordMinLen: 2, wordMaxLen: 2, wordDistractors: 0, memoryPairs: 6 },
  2: { tiles: 9,  numberRange: 20, countMax: 8,  addMax: 10, subMax: 15, compareMax: 20, optionCount: 4, optionSpread: 5, wordMinLen: 3, wordMaxLen: 3, wordDistractors: 1, memoryPairs: 8 },
  3: { tiles: 12, numberRange: 30, countMax: 10, addMax: 15, subMax: 25, compareMax: 30, optionCount: 5, optionSpread: 8, wordMinLen: 3, wordMaxLen: 4, wordDistractors: 2, memoryPairs: 10 },
};
const LEVELS = [1, 2, 3];

// ---------- Tiện ích ngẫu nhiên tất định ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function useRandom(fn) { return vi.spyOn(Math, 'random').mockImplementation(fn); }
function forceThenRandom(first, prng) {
  let used = false;
  return () => { if (!used) { used = true; return first; } return prng(); };
}
const TYPE_SEED = { count: 0.0, add: 0.3, sub: 0.6, compare: 0.9 };

afterEach(() => { vi.restoreAllMocks(); });

// ---------- Hàm định dạng / chỉ số ----------
describe('formatDuration', () => {
  it('định dạng đúng phút:giây với số 0 đệm', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(1000)).toBe('0:01');
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(600000)).toBe('10:00');
  });
  it('làm tròn xuống phần dưới giây', () => {
    expect(formatDuration(1999)).toBe('0:01');
  });
});

describe('wrapIndex', () => {
  it('giữ nguyên trong khoảng, cuộn vòng khi âm/vượt quá', () => {
    expect(wrapIndex(0, 10)).toBe(0);
    expect(wrapIndex(9, 10)).toBe(9);
    expect(wrapIndex(-1, 10)).toBe(9);
    expect(wrapIndex(10, 10)).toBe(0);
    expect(wrapIndex(-1, LETTERS.length)).toBe(LETTERS.length - 1);
  });
});

describe('getWriteValue & writeLabelText', () => {
  it('chữ HOA / thường / số theo trạng thái write', () => {
    expect(getWriteValue({ source: 'abc', index: 0, case: 'upper' })).toBe('A');
    expect(getWriteValue({ source: 'abc', index: 0, case: 'lower' })).toBe('a');
    expect(getWriteValue({ source: 'num', index: 3, case: 'upper' })).toBe('3');
  });
  it('cuộn vòng theo index', () => {
    expect(getWriteValue({ source: 'num', index: 13, case: 'upper' })).toBe('3');
    expect(getWriteValue({ source: 'abc', index: LETTERS.length, case: 'upper' })).toBe('A');
  });
  it('nhãn đúng theo nguồn/case', () => {
    expect(writeLabelText({ source: 'num' })).toBe('số');
    expect(writeLabelText({ source: 'abc', case: 'upper' })).toBe('chữ HOA');
    expect(writeLabelText({ source: 'abc', case: 'lower' })).toBe('chữ thường');
  });
});

// ---------- Cấu hình độ khó ----------
describe('tileCountForLevel & numberRangeForLevel', () => {
  it('khớp cấu hình mong đợi từng cấp', () => {
    for (const lv of LEVELS) {
      expect(tileCountForLevel(lv)).toBe(CFG[lv].tiles);
      expect(numberRangeForLevel(lv)).toBe(CFG[lv].numberRange);
    }
  });
  it('phạm vi số luôn đủ chỗ cho số ô (tránh vòng lặp vô hạn ở buildPool)', () => {
    for (const lv of LEVELS) {
      expect(numberRangeForLevel(lv) + 1).toBeGreaterThanOrEqual(tileCountForLevel(lv));
    }
  });
});

// ---------- shuffle ----------
describe('shuffle', () => {
  it('trả về một hoán vị và KHÔNG làm biến đổi mảng gốc', () => {
    useRandom(mulberry32(1));
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = input.slice();
    const out = shuffle(input);
    expect(input).toEqual(copy);
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual(copy);
  });
});

// ---------- buildPool ----------
describe('buildPool', () => {
  it('chế độ abc: đúng số ô, khoá duy nhất', () => {
    useRandom(mulberry32(7));
    for (const lv of LEVELS) {
      const pool = buildPool('abc', lv);
      expect(pool).toHaveLength(CFG[lv].tiles);
      expect(new Set(pool.map(t => t.key)).size).toBe(pool.length);
    }
  });
  it('chế độ số: đúng số ô, giá trị duy nhất và trong phạm vi', () => {
    for (const lv of LEVELS) {
      useRandom(mulberry32(lv * 13 + 1));
      const pool = buildPool('num', lv);
      expect(pool).toHaveLength(CFG[lv].tiles);
      const vals = pool.map(t => t.base);
      expect(new Set(vals).size).toBe(vals.length);
      for (const v of vals) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(CFG[lv].numberRange);
      }
    }
  });
});

// ---------- buildListenRound (Nghe Âm) ----------
describe('buildListenRound', () => {
  it('đúng số ô, có đúng một mục tiêu, ô nhiễu không trùng âm với mục tiêu', () => {
    for (const lv of LEVELS) {
      for (let s = 0; s < 60; s++) {
        useRandom(mulberry32(s * 7 + lv));
        const r = buildListenRound(lv);
        expect(r.tokens).toHaveLength(CFG[lv].tiles);
        expect(r.target).toBeTruthy();
        const targetSound = r.target.sound;
        const others = r.tokens.filter(t => t.base !== r.target.base);
        for (const o of others) expect(o.sound).not.toBe(targetSound);
        expect(LETTERS).toContain(r.target.base);
        vi.restoreAllMocks();
      }
    }
  });
});

// ---------- buildMathQuestion ----------
describe('buildMathQuestion', () => {
  it('phép trừ không bao giờ ra số âm (b ≤ a)', () => {
    for (let s = 0; s < 300; s++) {
      useRandom(forceThenRandom(TYPE_SEED.sub, mulberry32(s + 1)));
      const q = buildMathQuestion(3);
      expect(q.type).toBe('sub');
      expect(q.b).toBeLessThanOrEqual(q.a);
      expect(q.correct).toBe(q.a - q.b);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      vi.restoreAllMocks();
    }
  });
  it('phép cộng đúng kết quả và trong giới hạn cấp độ', () => {
    for (const lv of LEVELS) {
      for (let s = 0; s < 100; s++) {
        useRandom(forceThenRandom(TYPE_SEED.add, mulberry32(s + 1)));
        const q = buildMathQuestion(lv);
        expect(q.type).toBe('add');
        expect(q.correct).toBe(q.a + q.b);
        expect(q.a).toBeLessThanOrEqual(CFG[lv].addMax);
        expect(q.b).toBeLessThanOrEqual(CFG[lv].addMax);
        vi.restoreAllMocks();
      }
    }
  });
  it('đếm: số lượng trong [1, countMax] và đúng số emoji', () => {
    for (const lv of LEVELS) {
      useRandom(forceThenRandom(TYPE_SEED.count, mulberry32(lv * 5 + 2)));
      const q = buildMathQuestion(lv);
      expect(q.type).toBe('count');
      expect(q.correct).toBeGreaterThanOrEqual(1);
      expect(q.correct).toBeLessThanOrEqual(CFG[lv].countMax);
      expect(q.objects).toHaveLength(q.correct);
    }
  });
  it('so sánh: dấu khớp quan hệ a ? b', () => {
    for (let s = 0; s < 200; s++) {
      useRandom(forceThenRandom(TYPE_SEED.compare, mulberry32(s + 1)));
      const q = buildMathQuestion(2);
      expect(q.type).toBe('compare');
      const expected = q.a > q.b ? '>' : q.a < q.b ? '<' : '=';
      expect(q.correct).toBe(expected);
      vi.restoreAllMocks();
    }
  });
});

// ---------- buildNumericOptions ----------
describe('buildNumericOptions', () => {
  it('luôn chứa đáp án đúng, đủ số lựa chọn, không âm, không trùng', () => {
    for (const lv of LEVELS) {
      for (const correct of [0, 1, 5, 12, 30]) {
        useRandom(mulberry32(correct * 7 + lv));
        const opts = buildNumericOptions(correct, lv);
        expect(opts).toHaveLength(CFG[lv].optionCount);
        const bases = opts.map(o => o.base);
        expect(bases).toContain(correct);
        expect(new Set(bases).size).toBe(bases.length);
        for (const v of bases) expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('vẫn đủ lựa chọn khi correct = 0 (nhánh bù dự phòng)', () => {
    useRandom(() => 0);
    const opts = buildNumericOptions(0, 3);
    expect(opts).toHaveLength(CFG[3].optionCount);
    expect(opts.map(o => o.base)).toContain(0);
  });
});

// ---------- buildMathOptions ----------
describe('buildMathOptions', () => {
  it('so sánh: đúng 3 dấu và có token đúng', () => {
    useRandom(mulberry32(3));
    const built = buildMathOptions({ type: 'compare', correct: '>' }, 2);
    expect(built.tokens.map(t => t.base).sort()).toEqual(['<', '=', '>']);
    expect(built.correctToken.base).toBe('>');
  });
  it('số học: token đúng khớp đáp án', () => {
    useRandom(mulberry32(9));
    const built = buildMathOptions({ type: 'add', correct: 7 }, 3);
    expect(built.correctToken).toBeTruthy();
    expect(String(built.correctToken.base)).toBe('7');
  });
});

// ---------- buildWordQuestion ----------
describe('buildWordQuestion', () => {
  it('các ô chứa đủ chữ của từ; số ô nhiễu đúng cấp; nhiễu không trùng chữ trong từ', () => {
    for (const lv of LEVELS) {
      for (let s = 0; s < 60; s++) {
        useRandom(mulberry32(s * 3 + lv));
        const q = buildWordQuestion(lv);
        const wordLetters = q.word.split('');
        const tileLetters = q.tiles.map(t => t.letter);
        for (const ch of wordLetters) expect(tileLetters).toContain(ch);
        expect(q.tiles).toHaveLength(wordLetters.length + CFG[lv].wordDistractors);
        const wordSet = new Set(wordLetters);
        const distractors = tileLetters.filter(l => !wordSet.has(l));
        expect(distractors.length).toBeLessThanOrEqual(CFG[lv].wordDistractors);
        vi.restoreAllMocks();
      }
    }
  });
  it('cấp 1 chỉ chọn từ 2 chữ cái', () => {
    for (let s = 0; s < 40; s++) {
      useRandom(mulberry32(s + 1));
      expect(buildWordQuestion(1).word.length).toBe(2);
      vi.restoreAllMocks();
    }
  });
});

// ---------- buildMemoryBoard ----------
describe('buildMemoryBoard', () => {
  it('đúng số thẻ, mỗi emoji xuất hiện đúng 2 lần, cờ khởi tạo false', () => {
    for (const lv of LEVELS) {
      useRandom(mulberry32(lv * 11 + 4));
      const cards = buildMemoryBoard(lv);
      const pairs = CFG[lv].memoryPairs;
      expect(cards).toHaveLength(pairs * 2);
      const counts = {};
      for (const c of cards) {
        counts[c.emoji] = (counts[c.emoji] || 0) + 1;
        expect(c.flipped).toBe(false);
        expect(c.matched).toBe(false);
      }
      expect(Object.keys(counts)).toHaveLength(pairs);
      for (const e of Object.keys(counts)) expect(counts[e]).toBe(2);
    }
  });
});

// ---------- connectPathFor (Nối chấm) ----------
describe('connectPathFor', () => {
  it('mọi chữ HOA, chữ thường và chữ số đều có đường nét hợp lệ', () => {
    const values = [
      ...LETTERS,
      ...LETTERS.map(l => l.toLowerCase()),
      ...NUMBERS_LIST,
    ];
    for (const v of values) {
      const path = connectPathFor(v);
      expect(path, `thiếu đường nét cho "${v}"`).toBeTruthy();
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(0);
      for (const stroke of path) {
        expect(Array.isArray(stroke)).toBe(true);
        expect(stroke.length).toBeGreaterThan(0);
        for (const pt of stroke) {
          expect(pt).toHaveLength(2);
          expect(typeof pt[0]).toBe('number');
          expect(typeof pt[1]).toBe('number');
        }
      }
    }
  });
  it('trả về null cho ký tự không hỗ trợ', () => {
    expect(connectPathFor('@')).toBeNull();
  });
});

// ---------- Toàn vẹn dữ liệu ----------
describe('Toàn vẹn dữ liệu', () => {
  it('mọi chữ cái dùng trong WORDS đều nằm trong LETTERS', () => {
    const letterSet = new Set(LETTERS);
    for (const w of WORDS) {
      for (const ch of w.word.split('')) {
        expect(letterSet.has(ch), `chữ "${ch}" trong "${w.word}" không có trong LETTERS`).toBe(true);
      }
    }
  });
  it('mọi chữ trong LETTERS đều có âm trong LISTEN_SOUNDS', () => {
    for (const l of LETTERS) expect(LISTEN_SOUNDS[l], `thiếu âm cho ${l}`).toBeTruthy();
  });
  it('MEMORY_EMOJIS đủ cho cấp khó nhất', () => {
    expect(MEMORY_EMOJIS.length).toBeGreaterThanOrEqual(CFG[3].memoryPairs);
  });
});
