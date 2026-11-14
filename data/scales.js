/*
 * data/scales.js — гаммы, натуральные лады, пентатоника (5 боксов CAGED),
 * блюзовые гаммы с «синей» нотой и 3 позиции на грифе для каждой гаммы.
 */

import {
  STRINGS,
  mod,
  parseNote,
  prettyNote,
  rootMidi,
  spellInterval,
} from "./notes.js";

export const SCALES = [
  {
    id: "major",
    category: "basic",
    name: "Натуральный мажор (ионийский)",
    offsets: [0, 2, 4, 5, 7, 9, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
    formula: "Т – Т – П – Т – Т – Т – П",
    description:
      "Главная точка отсчёта всей европейской теории музыки. Два полутона спрятаны между III–IV и VII–I ступенями: именно VII ступень (вводный тон) остро тянется домой в тонику.",
    onFingers:
      "В C-мажоре начни со среднего пальца на 5-й струне (3 лад C): 5-я (3, 5), 4-я (2, 3, 5), 3-я (2, 4, 5) — ни одного диеза или бемоля!",
    commonMistake:
      "Играют гамму вверх-вниз как скороговорку от 6-й струны, не останавливаясь на тонике — из-за этого ухо перестаёт слышать, какая нота главная.",
  },
  {
    id: "harmonicMajor",
    category: "basic",
    name: "Гармонический мажор (♭6)",
    offsets: [0, 2, 4, 5, 7, 8, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "3", "4", "5", "♭6", "7"],
    formula: "Т – Т – П – Т – П – 1½Т – П",
    description:
      "Мажор с пониженной VI ступенью (любимая краска Римского-Корсакова, Чайковского и романтических баллад). Между ♭VI и VII возникает выразительная полуторатоновая «восточная» ступенька.",
    onFingers:
      "В C-мажоре замени ноту A на A♭ (3-я струна, 1-й лад вместо 2-го), сохранив солнечную терцию E и вводный тон B: C–D–E–F–G–A♭–B.",
    commonMistake:
      "По привычке понижают вместе с VI ещё и VII ступень — но тогда исчезает полуторатоновый шаг и получается миксолидийский/эолийский оборот вместо гармонического мажора.",
  },
  {
    id: "naturalMinor",
    category: "basic",
    name: "Натуральный минор (эолийский)",
    offsets: [0, 2, 3, 5, 7, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
    formula: "Т – П – Т – Т – П – Т – Т",
    description:
      "Мягкая, распевная минорная палитра без искусственного обострения VII ступени. Основа рока, фолка и современной поп-музыки.",
    onFingers:
      "В A-миноре (A B C D E F G): 6-я струна (5, 7, 8 лады), 5-я (5, 7, 8), 4-я (5, 7) — удобная симметричная аппликатура.",
    commonMistake:
      "Путают параллельные A-минор и C-мажор: ноты одни и те же, но если фраза всё время приземляется на C, слушатель услышит мажор, а не минор!",
  },
  {
    id: "harmonicMinor",
    category: "basic",
    name: "Гармонический минор (♯7)",
    offsets: [0, 2, 3, 5, 7, 8, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "7"],
    formula: "Т – П – Т – Т – П – 1½Т – П",
    description:
      "Натуральный минор с повышенной VII ступенью: появляется яркий вводный тон за полтона до тоники и мажорный аккорд доминанты V7 (например, E7 в Am).",
    onFingers:
      "В A-миноре на 4-й струне вместо 5-го лада (G) сыграй 6-й лад (G♯) и сразу разреши его в 7-й лад (A): услышишь классику и неоклассический рок.",
    commonMistake:
      "Играют гармонический минор поверх спокойного минорного аккорда Dm или C, тогда как лучше всего он раскрывается именно на доминанте E7!",
  },
  {
    id: "melodicMinor",
    category: "basic",
    name: "Мелодический минор (↑ восх. / ↓ нисх.)",
    offsets: [0, 2, 3, 5, 7, 9, 11],
    descendingOffsets: [0, 2, 3, 5, 7, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "♭3", "4", "5", "6", "7"],
    formula: "↑ Т – П – Т – Т – Т – Т – П · ↓ натуральный минор",
    description:
      "Чтобы убрать резкий скачок в 1½ тона из гармонического минора, при движении вверх повышают и VI, и VII ступени (как в мажоре, но с минорной ♭3!). В классике вниз возвращаются по натуральному минору, а в джазе играют верхний вариант в обе стороны.",
    onFingers:
      "В A-мелодическом миноре вверх звучат A–B–C–D–E–F♯–G♯–A (на 4-й струне лады 4–6–7), а вниз — A–G♮–F♮–E–D–C–B–A.",
    commonMistake:
      "Забывают вернуть знаки (бекары G♮ и F♮) при классическом движении вниз — в плеере и переключателе ниже можно сравнить оба направления.",
  },
  {
    id: "minorPent",
    category: "pentatonic",
    name: "Минорная пентатоника",
    offsets: [0, 3, 5, 7, 10],
    steps: [0, 2, 3, 4, 6],
    degrees: ["1", "♭3", "4", "5", "♭7"],
    formula: "1½Т – Т – Т – 1½Т – Т",
    description:
      "Натуральный минор без II и ♭VI ступеней — убраны оба резких полутона! Пять звуков, которые звучат убедительно почти в любом порядке.",
    onFingers:
      "Знаменитый 1-й бокс от A (5-й лад 6-й струны): по две ноты на каждой струне — 5–8, 5–7, 5–7, 5–7, 5–8, 5–8.",
    commonMistake:
      "Застревают навечно в 1-м боксе на 5-м ладу и боятся грифа выше 8-го лада — выучи все 5 боксов в разделе 09!",
  },
  {
    id: "majorPent",
    category: "pentatonic",
    name: "Мажорная пентатоника",
    offsets: [0, 2, 4, 7, 9],
    steps: [0, 1, 2, 4, 5],
    degrees: ["1", "2", "3", "5", "6"],
    formula: "Т – Т – 1½Т – Т – 1½Т",
    description:
      "Натуральный мажор без IV и VII ступеней (без тритона!). Солнечный, летящий звук кантри, соула, фанка и мажорного рок-н-ролла (B.B. King, Allman Brothers).",
    onFingers:
      "У C-мажорной пентатоники (C D E G A) те же ноты, что у A-минорной, но тоника — C (6-я струна, 8-й лад под мизинцем или указательным пальцем во 2-м боксе).",
    commonMistake:
      "Берут знакомую форму A-минорной пентатоники в C-мажоре, но по привычке заканчивают фразы на ноте A вместо C.",
  },
  {
    id: "minorBlues",
    category: "blues",
    name: "Минорная блюзовая гамма",
    offsets: [0, 3, 5, 6, 7, 10],
    steps: [0, 2, 3, 4, 4, 6],
    degrees: ["1", "♭3", "4", "♭5", "5", "♭7"],
    blueNoteOffset: 6,
    formula: "1½Т – Т – П – П – 1½Т – Т",
    description:
      "Минорная пентатоника + хроматическая «блюзовая нота» ♭5 между 4-й и 5-й ступенями. Даёт терпкий, «грязноватый», вокальный блюзовый оттенок.",
    onFingers:
      "В A-минорном боксе на 5-м ладу добавь 6-й лад на 5-й струне (E♭) и 8-й лад на 3-й струне (E♭): проскальзывай через неё слайдом в E или уходи обратно в D!",
    commonMistake:
      "Останавливаются и долго «висят» на ноте ♭5 (тритоне!) как на опорной — в блюзе это проходящая специя, её нужно сразу увести в 5 или 4 ступень.",
  },
  {
    id: "majorBlues",
    category: "blues",
    name: "Мажорная блюзовая гамма",
    offsets: [0, 2, 3, 4, 7, 9],
    steps: [0, 1, 2, 2, 4, 5],
    degrees: ["1", "2", "♭3", "3", "5", "6"],
    blueNoteOffset: 3,
    formula: "Т – П – П – 1½Т – Т – 1½Т",
    description:
      "Мажорная пентатоника + «синяя» нота ♭3 перед мажорной терцией 3. Светлая, игривая краска свинга, джаз-блюза и кантри.",
    onFingers:
      "В A-мажоре на 3-й струне подтяни или сдвинь 5-й лад (C, ♭3) на полтона вверх в 6-й лад (C♯, мажорная терция) — фирменный приём B.B. King!",
    commonMistake:
      "Тянут ноту ♭3 вниз к ре вместо того, чтобы дотянуть её на полтона вверх в светлую мажорную терцию 3.",
  },
  {
    id: "dorian",
    category: "modes",
    name: "Дорийский лад (минор с ♮6)",
    offsets: [0, 2, 3, 5, 7, 9, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "♭3", "4", "5", "6", "♭7"],
    formula: "Т – П – Т – Т – Т – П – Т",
    description:
      "Минор с высокой (большой) VI ступенью. Звучит благородно, фанково и светлее натурального минора (Карлос Сантана «Oye Como Va», Pink Floyd «Another Brick in the Wall»).",
    onFingers:
      "В A-дорийском поверх связки Am7 – D7 сыграй F♯ (2-я струна, 7-й лад или 4-я струна, 4-й лад) вместо обычной F.",
    commonMistake:
      "Пролетают мимо 6-й ступени (F♯ в ля), и тогда слушатель не отличает дорийский лад от обычной пентатоники.",
  },
  {
    id: "phrygian",
    category: "modes",
    name: "Фригийский лад (минор с ♭2)",
    offsets: [0, 1, 3, 5, 7, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"],
    formula: "П – Т – Т – Т – П – Т – Т",
    description:
      "Минор с пониженной II ступенью: полутон прямо от тоники создаёт мгновенный испанский (фламенко) и метальный колорит.",
    onFingers:
      "На 6-й открытой струне E сразу нажми 1-й лад F: чередование аккордов E и F (или Em и F) мгновенно включает фригийское настроение.",
    commonMistake:
      "Забывают возвращаться на тонику E, и ухо начинает слышать обычный до мажор вместо ми-фригийского лада.",
  },
  {
    id: "lydian",
    category: "modes",
    name: "Лидийский лад (мажор с ♯4)",
    offsets: [0, 2, 4, 6, 7, 9, 11],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "3", "♯4", "5", "6", "7"],
    formula: "Т – Т – Т – П – Т – Т – П",
    description:
      "Мажор с повышенной IV ступенью (♯4). Создаёт ощущение полёта, космоса и волшебства (Джо Сатриани «Flying in a Blue Dream», киномузыка Джона Уильямса).",
    onFingers:
      "Поверх аккорда Cmaj7 выдели F♯ на 2-й струне, 7-м ладу или 1-й струне, 2-м ладу.",
    commonMistake:
      "Меняют аккорд в аккомпанементе на G-мажор надолго — и магия ♯4 пропадает, превращаясь в обычный соль мажор.",
  },
  {
    id: "mixolydian",
    category: "modes",
    name: "Миксолидийский лад (мажор с ♭7)",
    offsets: [0, 2, 4, 5, 7, 9, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "2", "3", "4", "5", "6", "♭7"],
    formula: "Т – Т – П – Т – Т – П – Т",
    description:
      "Мажор с малой (блюзово-роковой) септимой ♭7. Родной лад доминантсептаккордов (A7, G7) и классического рока («Sweet Child O' Mine», «Norwegian Wood»).",
    onFingers:
      "В A-миксолидийском играй как ля мажор, но вместо G♯ бери чистую G (открытая 3-я струна или 4-я на 5-м ладу) — идеально ложится на рифф A – G – D!",
    commonMistake:
      "Берут высокую 7 ступень (G♯) поверх блюз-рокового аккорда A7 и получают резкое столкновение с B♭/G в аккорде.",
  },
  {
    id: "locrian",
    category: "modes",
    name: "Локрийский лад (♭2, ♭5)",
    offsets: [0, 1, 3, 5, 6, 8, 10],
    steps: [0, 1, 2, 3, 4, 5, 6],
    degrees: ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"],
    formula: "П – Т – Т – П – Т – Т – Т",
    description:
      "Единственный диатонический лад с уменьшённой квинтой ♭5 вместо чистой квинты. Неустойчивый, сумрачный лад для обыгрывания полууменьшённого аккорда m7♭5.",
    onFingers:
      "Поверх Bm7♭5 (перед E7 → Am) сыграй ноты B C D E F G A — все белые клавиши от ноты си.",
    commonMistake:
      "Пытаются написать в локрийском ладу спокойную песню: без чистой квинты тоника всё время хочет «провалиться» в соседний аккорд.",
  },
];

export function getScale(id) {
  return SCALES.find((item) => item.id === id) || SCALES[0];
}

export function scaleNames(root, scale, direction = "up") {
  const offsets =
    direction === "down" && scale.descendingOffsets
      ? scale.descendingOffsets
      : scale.offsets;
  return offsets.map((n, i) => spellInterval(root, n, scale.steps[i]));
}

export function scalePcs(root, scale, direction = "up") {
  const offsets =
    direction === "down" && scale.descendingOffsets
      ? scale.descendingOffsets
      : scale.offsets;
  return offsets.map((n) => mod(parseNote(root).pc + n));
}

export function scaleNotes(root, scale, withOctave = true, direction = "up") {
  const midi = rootMidi(root);
  const offsets =
    direction === "down" && scale.descendingOffsets
      ? scale.descendingOffsets
      : scale.offsets;
  const names = scaleNames(root, scale, direction);
  const result = offsets.map((offset, i) => ({
    midi: midi + offset,
    name: names[i],
    degree: scale.degrees ? scale.degrees[i] : String(i + 1),
    isBlue: scale.blueNoteOffset != null && offset === scale.blueNoteOffset,
  }));
  if (withOctave) {
    result.push({ midi: midi + 12, name: root, degree: "8", isBlue: false });
  }
  return result;
}

/*
 * Генерация 3 игровых позиций на грифе (0..15 лады) для ЛЮБОЙ гаммы:
 * Позиция I — нижне-средняя зона (от тоники на 6-й струне или открытой позиции),
 * Позиция II — средняя зона (от тоники на 5-й струне),
 * Позиция III — верхняя зона (+4..5 ладов выше Позиции II, в пределах 15 ладов).
 */
export function getScaleThreePositions(root, scale, direction = "up") {
  const rootPc = parseNote(root).pc;
  const pcs = new Set(scalePcs(root, scale, direction));
  const fret6 = mod(rootPc - mod(STRINGS[5].midi), 12); // лад тоники на 6-й струне (0..11)
  const fret5 = mod(rootPc - mod(STRINGS[4].midi), 12); // лад тоники на 5-й струне (0..11)

  const rawWindows = [
    {
      id: 1,
      title: "Позиция I (от 6-й струны)",
      start: Math.max(0, fret6 - 1),
      color: "#376b53",
    },
    {
      id: 2,
      title: "Позиция II (от 5-й струны)",
      start: Math.max(0, fret5 - 1),
      color: "#4a7a96",
    },
    {
      id: 3,
      title: "Позиция III (верхний регистр)",
      start: ((fret6 + 7) % 11) + 1,
      color: "#9b6b34",
    },
  ];

  // Следим, чтобы окна не совпадали по начальному ладу
  const usedStarts = new Set();
  return rawWindows.map((win, idx) => {
    let minFret = Math.min(11, win.start);
    while (usedStarts.has(minFret)) {
      minFret = (minFret + 4) % 12;
    }
    usedStarts.add(minFret);
    const maxFret = Math.min(15, minFret + 4);
    const positions = [];
    STRINGS.forEach((str, s) => {
      for (let f = minFret; f <= maxFret; f++) {
        const midi = str.midi + f;
        const pc = mod(midi);
        if (pcs.has(pc)) {
          positions.push({
            string: s,
            fret: f,
            midi,
            pc,
            key: `${s}:${f}`,
            isRoot: pc === rootPc,
          });
        }
      }
    });
    return {
      id: idx + 1,
      name: `Позиция ${idx + 1}`,
      title: `${win.title} · лады ${minFret}–${maxFret}`,
      minFret,
      maxFret,
      color: win.color,
      positions,
    };
  });
}

/*
 * Пять классических гитарных боксов пентатоники (по 2 ноты на струну, система CAGED / Молоткова).
 * Заданы относительно лада тоники минорной пентатоники на 6-й струне (для A minor: baseFret = 5).
 * Для мажорной пентатоники боксы строятся от параллельного минора (тоника - 3 пт),
 * при этом Бокс 1 мажорной пентатоники начинается прямо с мажорной тоники на 6-й струне!
 */
const MINOR_BOX_TEMPLATES = [
  {
    boxNo: 1,
    cagedForm: "Форма Em/Am (главный бокс от 6-й струны)",
    // Смещения [нижняя нота, верхняя нота] на струнах от 6-й (индекс 5) к 1-й (индекс 0) относительно лада минорной тоники на 6-й струне:
    stringOffsetsFrom6to1: [
      [0, 3],
      [0, 2],
      [0, 2],
      [0, 2],
      [0, 3],
      [0, 3],
    ],
    fingers6to1: ["1–4", "1–3", "1–3", "1–3", "1–4", "1–4"],
    bendHint:
      "3-я струна (+2 лада от базы) — бенд на целый тон в квинту; 2-я струна (+3 лада) — бенд на тон в тонику!",
    color: "#376b53",
  },
  {
    boxNo: 2,
    cagedForm: "Форма C/Dm (бокс мажорной тоники на 6-й струне)",
    stringOffsetsFrom6to1: [
      [3, 5],
      [2, 5],
      [2, 5],
      [2, 4],
      [3, 5],
      [3, 5],
    ],
    fingers6to1: ["2–4", "1–4", "1–4", "1–3", "2–4", "2–4"],
    bendHint:
      "2-я струна (+5 ладов от базы) — певучий бенд на тон; отлично соединяется слайдом из Бокса 1 по 3-й струне!",
    color: "#437591",
  },
  {
    boxNo: 3,
    cagedForm: "Форма A/Cm (средний связующий бокс)",
    stringOffsetsFrom6to1: [
      [5, 7],
      [5, 7],
      [5, 7],
      [4, 7],
      [5, 8],
      [5, 7],
    ],
    fingers6to1: ["1–3", "1–3", "1–3", "1–4", "1–4", "1–3"],
    bendHint:
      "2-я струна (верхняя нота) — классический блюзовый бенд на целый тон в малую терцию.",
    color: "#8e6b32",
  },
  {
    boxNo: 4,
    cagedForm: "Форма G/Am от 5-й струны",
    stringOffsetsFrom6to1: [
      [7, 10],
      [7, 10],
      [7, 9],
      [7, 9],
      [8, 10],
      [7, 10],
    ],
    fingers6to1: ["1–4", "1–4", "1–3", "1–3", "2–4", "1–4"],
    bendHint:
      "Тоника удобно лежит под указательным пальцем на 5-й струне и средним пальцем на 2-й струне.",
    color: "#7e5385",
  },
  {
    boxNo: 5,
    cagedForm: "Форма D/Gm (подводящий к 1-му боксу снизу)",
    stringOffsetsFrom6to1: [
      [10, 12],
      [10, 12],
      [9, 12],
      [9, 12],
      [10, 12],
      [10, 12],
    ],
    fingers6to1: ["2–4", "2–4", "1–4", "1–4", "2–4", "2–4"],
    bendHint:
      "Симметричный бокс «через лад» на крайних струнах — идеальный трамплин обратно в 1-й бокс!",
    color: "#9a4d41",
  },
];

export function getPentatonicBoxes(
  root,
  type = "minorPent",
  includeBlue = false,
) {
  const isMajor = type === "majorPent" || type === "majorBlues";
  const rootPc = parseNote(root).pc;
  // Параллельный минор для мажора находится на 3 полутона ниже (например, C major -> A minor)
  const relMinorPc = isMajor ? mod(rootPc - 3) : rootPc;
  const baseFret6 = mod(relMinorPc - mod(STRINGS[5].midi), 12); // для A = 5, для E = 0
  const bluePc = includeBlue ? mod(rootPc + (isMajor ? 3 : 6)) : null;

  // В мажорной пентатонике нумеруем боксы начиная с шаблона №2 (где на 6-й струне лежит мажорная тоника!)
  const orderedTemplates = isMajor
    ? [
        MINOR_BOX_TEMPLATES[1],
        MINOR_BOX_TEMPLATES[2],
        MINOR_BOX_TEMPLATES[3],
        MINOR_BOX_TEMPLATES[4],
        MINOR_BOX_TEMPLATES[0],
      ]
    : MINOR_BOX_TEMPLATES;

  return orderedTemplates.map((tpl, idx) => {
    // Один октавный сдвиг для всей формы: не разрываем бокс по струнам.
    const candidates = [0, -12, 12];
    const scoreShift = (shift) =>
      tpl.stringOffsetsFrom6to1
        .flat()
        .filter(
          (offset) =>
            baseFret6 + offset + shift >= 0 && baseFret6 + offset + shift <= 15,
        ).length;
    const shift = candidates.sort((a, b) => scoreShift(b) - scoreShift(a))[0];
    const positions = [];
    const bluePositions = [];
    let minFret = 99;
    let maxFret = 0;
    for (let i = 0; i < 6; i++) {
      const string = 5 - i;
      const frets = tpl.stringOffsetsFrom6to1[i].map(
        (offset) => baseFret6 + offset + shift,
      );
      frets.forEach((fret, noteIdx) => {
        if (fret < 0 || fret > 15) return;
        const midi = STRINGS[string].midi + fret;
        minFret = Math.min(minFret, fret);
        maxFret = Math.max(maxFret, fret);
        positions.push({
          string,
          fret,
          midi,
          pc: mod(midi),
          key: `${string}:${fret}`,
          isRoot: mod(midi) === rootPc,
          finger: tpl.fingers6to1[i].split("–")[noteIdx],
        });
      });
    }
    // Блюзовые ноты находятся только внутри видимой области выбранного бокса.
    if (bluePc !== null && minFret <= maxFret) {
      STRINGS.forEach((str, string) => {
        for (let fret = minFret; fret <= maxFret; fret++) {
          const midi = str.midi + fret;
          if (mod(midi) === bluePc)
            bluePositions.push({
              string,
              fret,
              midi,
              pc: bluePc,
              key: `${string}:${fret}`,
              isBlue: true,
            });
        }
      });
    }

    if (minFret > maxFret) {
      // Резервное окно, если бокс пересёк порожек (открытая позиция 0..4)
      minFret = 0;
      maxFret = 4;
      const scaleObj = getScale(
        includeBlue
          ? isMajor
            ? "majorBlues"
            : "minorBlues"
          : isMajor
            ? "majorPent"
            : "minorPent",
      );
      const allowed = new Set(scalePcs(root, scaleObj));
      STRINGS.forEach((str, s) => {
        for (let f = 0; f <= 4; f++) {
          const midi = str.midi + f;
          const pc = mod(midi);
          if (allowed.has(pc)) {
            if (bluePc !== null && pc === bluePc) {
              bluePositions.push({
                string: s,
                fret: f,
                midi,
                pc,
                key: `${s}:${f}`,
                isBlue: true,
              });
            } else {
              positions.push({
                string: s,
                fret: f,
                midi,
                pc,
                key: `${s}:${f}`,
                isRoot: pc === rootPc,
              });
            }
          }
        }
      });
    }

    return {
      boxNo: idx + 1,
      name: `Бокс ${idx + 1}`,
      title: `Бокс ${idx + 1} · лады ${minFret}–${maxFret}`,
      cagedForm: tpl.cagedForm,
      fingersSummary: `От 6-й к 1-й струне: ${tpl.fingers6to1.join(" · ")}`,
      bendHint: tpl.bendHint,
      minFret,
      maxFret,
      color: tpl.color,
      positions,
      bluePositions,
    };
  });
}

// Сравнительная подсказка: какие ноты убираются из 7-ступенной гаммы для получения пентатоники.
export function explainPentatonicDerivation(root, isMajor = false) {
  const fullScale = getScale(isMajor ? "major" : "naturalMinor");
  const pentScale = getScale(isMajor ? "majorPent" : "minorPent");
  const fullNames = scaleNames(root, fullScale).map(prettyNote);
  const pentNames = scaleNames(root, pentScale).map(prettyNote);
  const removed = isMajor
    ? `${fullNames[3]} (IV) и ${fullNames[6]} (VII)`
    : `${fullNames[1]} (II) и ${fullNames[5]} (♭VI)`;
  return {
    full: fullNames.join(" – "),
    pent: pentNames.join(" – "),
    removed,
  };
}
