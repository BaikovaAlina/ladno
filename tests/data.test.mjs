import assert from "node:assert/strict";
import { ROOTS, parseNote, positionsForMidi, STRINGS } from "../data/notes.js";
import { EAR_INTERVALS, getIntervalInversion } from "../data/intervals.js";
import { EAR_CHORD_TYPES, makeChord } from "../data/chords.js";
import {
  SCALES,
  scaleNames,
  scalePcs,
  getPentatonicBoxes,
} from "../data/scales.js";
import {
  diatonicChordsOfKey,
  PROGRESSIONS,
  progressionChords,
} from "../data/progressions.js";

assert.equal(EAR_INTERVALS.length, 12);
for (const interval of EAR_INTERVALS)
  assert.equal(
    interval.semitones + getIntervalInversion(interval.id).inverted.semitones,
    12,
  );
assert.equal(EAR_CHORD_TYPES.length, 9);
for (const root of ROOTS) {
  for (const scale of SCALES) {
    const names = scaleNames(root, scale),
      pcs = scalePcs(root, scale);
    assert.deepEqual(
      names.map((name) => parseNote(name).pc),
      pcs,
    );
  }
  for (const type of EAR_CHORD_TYPES) {
    const chord = makeChord(root, type);
    assert.equal(new Set(chord.pcs).size, type.offsets.length);
  }
  for (const type of ["minorPent", "majorPent"]) {
    const pcs = scalePcs(
      root,
      SCALES.find((s) => s.id === type),
    );
    const boxes = getPentatonicBoxes(root, type);
    assert.equal(boxes.length, 5);
    for (const box of boxes)
      for (const position of box.positions) {
        assert(pcs.includes(position.pc));
        assert(position.fret >= box.minFret && position.fret <= box.maxFret);
      }
  }
  assert.equal(diatonicChordsOfKey(root).length, 7);
  for (const progression of PROGRESSIONS)
    assert(progressionChords(root, progression).length > 0);
}
for (let midi = 40; midi <= 76; midi++)
  for (const p of positionsForMidi(midi, 12))
    assert.equal(STRINGS[p.string].midi + p.fret, midi);
console.log("Проверки данных пройдены");
