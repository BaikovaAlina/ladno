/*
 * ЯДРО: гармонические последовательности и каденции.
 *
 * Поля прогрессии:
 *   id          — идентификатор,
 *   name        — как она записывается римскими цифрами,
 *   title       — человеческое название,
 *   degrees     — ступени мажора (0..6) для аккордов,
 *   minorDegrees— вариант для минора (если есть),
 *   meter       — размер и длина: "4/4" или "3/4",
 *   beatsPerChord — сколько долей звучит один аккорд,
 *   character   — настроение,
 *   melodyTips  — типичные мелодические ходы: массив строк,
 *   example     — пример в C мажоре,
 *   origin      — откуда пришла (блюз, джаз, поп).
 */
import { makeChord, getTriad, getSeventh, chordOfDegree } from "./chords.js";
import { spellInterval } from "./notes.js";

export const PROGRESSIONS = [
  {
    id: "1451", name: "I – IV – V – I", title: "Три аккорда", origin: "классика, рок-н-ролл",
    degrees: [0, 3, 4, 0], meter: "4/4", beatsPerChord: 4,
    character: "Самая базовая схема: покой → движение → напряжение → покой.",
    melodyTips: [
      "На I держи 3-ю ступень — она сразу говорит «мажор».",
      "На IV поднимись на 4-ю ступень, на V — на 5-ю: получится плавная лестница.",
      "Последнюю фразу закончи на 1-й ступени — точка.",
    ],
    example: "C – F – G – C. Мелодия: E → F → G → C.",
  },
  {
    id: "1645", name: "I – vi – IV – V", title: "Сороковые", origin: "поп, ду-воп",
    degrees: [0, 5, 3, 4], meter: "4/4", beatsPerChord: 4,
    character: "Мягкий минорный оттенок в середине и сильное возвращение.",
    melodyTips: [
      "На vi можно спеть 6-ю ступень — она сестра тоники.",
      "На IV возвращайся к 3-й ступени: это «тёплая» нота.",
      "На V подготовь 7-ю ступень, чтобы она разрешилась в 1-ю.",
    ],
    example: "C – Am – F – G. Мелодия: C → E → F → D → C.",
  },
  {
    id: "1564", name: "I – V – vi – IV", title: "Четыре аккорда", origin: "поп, рок",
    degrees: [0, 4, 5, 3], meter: "4/4", beatsPerChord: 4,
    character: "Бесконечное движение: можно повторять, не надоедая.",
    melodyTips: [
      "Держи общий звук через все аккорды — например, 3-ю ступень.",
      "На vi опустись на 6-ю ступень и вернись на 5-ю.",
      "Не заканчивай на IV — строй фразу так, чтобы IV вела в I.",
    ],
    example: "C – G – Am – F. Мелодия: E → D → C → C.",
  },
  {
    id: "2511", name: "ii – V – I – I", title: "Джазовая каденция", origin: "джаз, стандарты",
    degrees: [1, 4, 0, 0], meter: "4/4", beatsPerChord: 2,
    character: "Движение по квинтам вниз: сильное, «правильное» разрешение.",
    melodyTips: [
      "Сыграй 4-ю ступень на ii и 3-ю ступень на I — получится классический ход.",
      "На V используй 7-ю ступень, она тянется в 1-ю.",
      "Септаккорды (ii7–V7–Imaj7) звучат мягче, чем трезвучия.",
    ],
    example: "Dm – G – C – C. Мелодия: F → F → E → E.",
  },
  {
    id: "blues12", name: "12-тактовый блюз", title: "Блюз I–IV–V", origin: "блюз",
    degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4], meter: "4/4", beatsPerChord: 4,
    character: "Двенадцать тактов, три аккорда, бесконечная форма.",
    melodyTips: [
      "Минорная пентатоника от тоники работает почти всегда.",
      "В 9–10-м такте добавь ♭5 — это и есть блюзовая нота.",
      "Заканчивай фразу на 4-й или 5-й ступени, а не на тонике: пусть останется вопрос.",
    ],
    example: "A7 – D7 – A7 – A7 | D7 – D7 – A7 – A7 | E7 – D7 – A7 – E7.",
  },
  {
    id: "minorIivv", name: "i – iv – v – i", title: "Минорная каденция", origin: "рок, фолк",
    // В мажоре эта же схема читается как I–IV–V–I, в миноре — как i–iv–v–i.
    degrees: [0, 3, 4, 0], minorDegrees: [0, 3, 4, 0], meter: "4/4", beatsPerChord: 4,
    character: "Тёмная версия I–IV–V: минорные трезвучия, мрачнее.",
    melodyTips: [
      "Мелодия — минорная пентатоника от тоники.",
      "На v поднимись на 7-ю ступень натурального минора.",
      "На i возвращайся на ♭3 — она «опора» минора.",
    ],
    example: "Am – Dm – Em – Am. Мелодия: C → D → E → C.",
  },
  {
    id: "1625", name: "I – vi – ii – V", title: "Круговой ход", origin: "джаз, эстрада",
    degrees: [0, 5, 1, 4], meter: "4/4", beatsPerChord: 2,
    character: "Плавное движение по квинтам, часто в конце припева.",
    melodyTips: [
      "Используй хроматические подъёмы: 1 → 2 → 3 на последнем аккорде.",
      "На ii удобно взять 4-ю ступень — она разрешится в 3-ю на I.",
      "Держи ритм ровным: эта гармония любит спокойную мелодию.",
    ],
    example: "C – Am – Dm – G. Мелодия: E → E → F → D.",
  },
  {
    id: "6415", name: "vi – IV – I – V", title: "Минорный старт", origin: "поп, рок",
    degrees: [5, 3, 0, 4], meter: "4/4", beatsPerChord: 4,
    character: "Начинается с минора, но приходит к свету — типично для баллад.",
    melodyTips: [
      "Стартуй с 6-й ступени, чтобы подчеркнуть минор.",
      "На IV пой в 4-ю ступень, на I — в 3-ю.",
      "На V дай мелодии «взлететь» на 5-ю или 7-ю ступень.",
    ],
    example: "Am – F – C – G. Мелодия: C → C → E → D.",
  },
  {
    id: "1345", name: "I – iii – IV – V", title: "Восходящая", origin: "классика, эстрада",
    degrees: [0, 2, 3, 4], meter: "3/4", beatsPerChord: 3,
    character: "Аккорды ползут вверх по ступеням — звучит как вопрос и ответ.",
    melodyTips: [
      "Повторяй мелодический мотив на каждой ступени — получится секвенция.",
      "На iii используй 3-ю или 5-ю ступень, не 1-ю.",
      "В 3/4 подчёркивай первую долю, две другие — легче.",
    ],
    example: "C – Em – F – G. Мелодия: E – E – F – D.",
  },
];

export const getProgression = (id) =>
  PROGRESSIONS.find((item) => item.id === id) || PROGRESSIONS[0];

/**
 * Аккорды прогрессии в выбранной тональности.
 * mode: "major" | "minor".
 * Обычные трезвучия; если withSevenths — строим септаккорды по тем же ступеням.
 */
export function progressionChords(root, progression, mode = "major", withSevenths = false) {
  if (mode === "minor") {
    // Для минорной каденции нужны только i, iv и v — строим их от тоники.
    const slots = {
      0: { offset: 0, steps: 0, roman: "i" },
      3: { offset: 5, steps: 3, roman: "iv" },
      4: { offset: 7, steps: 4, roman: "v" },
      5: { offset: 8, steps: 5, roman: "♭VI" },
    };
    const degrees = progression.minorDegrees || [0, 3, 4, 0];
    return degrees.map((degree) => {
      const slot = slots[degree] || slots[0];
      const name = spellInterval(root, slot.offset, slot.steps);
      return { ...makeChord(name, getTriad("minor")), roman: slot.roman, degree };
    });
  }
  return progression.degrees.map((degree) => {
    const chord = chordOfDegree(root, degree);
    if (!withSevenths) return chord;
    const seventhTypes = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
    return { ...makeChord(chord.root, getSeventh(seventhTypes[degree] || "maj7")), degree };
  });
}

/** Римская запись прогрессии для подписи. */
export function progressionLabel(progression, mode = "major") {
  if (mode !== "minor") return progression.name;
  return (progression.minorDegrees ? progression.minorDegrees : [0, 3, 4, 0])
    .map((degree, index) => ["i", "iv", "v", "i"][index] || "i")
    .join(" – ");
}
