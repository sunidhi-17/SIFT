const test = require('node:test');
const assert = require('node:assert');
const { getCyclePhase, isRoughLifeDay, computeGridStats, forecastNextHardWindow } = require('./logic.js');

test('Cycle Phase Calculation', (t) => {
  const cycleStarts = ['2023-10-01']; // average is 28 days

  // Day 1
  const d1 = getCyclePhase('2023-10-01', cycleStarts);
  assert.strictEqual(d1.dayOfCycle, 1);
  assert.strictEqual(d1.isPremenstrual, false);

  // Day 14
  const d14 = getCyclePhase('2023-10-14', cycleStarts);
  assert.strictEqual(d14.dayOfCycle, 14);
  assert.strictEqual(d14.isPremenstrual, false);

  // Day 22 (28 - 22 = 6, which is < 7, so premenstrual)
  const d22 = getCyclePhase('2023-10-22', cycleStarts);
  assert.strictEqual(d22.dayOfCycle, 22);
  assert.strictEqual(d22.isPremenstrual, true);

  // Day 28
  const d28 = getCyclePhase('2023-10-28', cycleStarts);
  assert.strictEqual(d28.dayOfCycle, 28);
  assert.strictEqual(d28.isPremenstrual, true);
});

test('Rough Life Classification', (t) => {
  assert.strictEqual(isRoughLifeDay(5, 1), false); // Great sleep, low stress
  assert.strictEqual(isRoughLifeDay(3, 3), false); // Mediocre
  assert.strictEqual(isRoughLifeDay(1, 3), true);  // Bad sleep
  assert.strictEqual(isRoughLifeDay(4, 5), true);  // Bad stress
});

test('Grid Stats Computation', (t) => {
  const starts = ['2023-10-01'];
  
  // Persona A: Dips specifically in premenstrual even when life is steady.
  const entries = [
    { date: '2023-10-10', mood: 4, sleep: 4, stress: 2 }, // rest, normal
    { date: '2023-10-11', mood: 4, sleep: 4, stress: 2 }, // rest, normal
    { date: '2023-10-23', mood: 2, sleep: 4, stress: 2 }, // premenstrual, normal
    { date: '2023-10-24', mood: 2, sleep: 4, stress: 2 }, // premenstrual, normal
    { date: '2023-10-25', mood: 1, sleep: 1, stress: 5 }, // premenstrual, rough
  ];

  const grid = computeGridStats(entries, starts);

  assert.strictEqual(grid.normal.rest.n, 2);
  assert.strictEqual(grid.normal.rest.avg, "4.00");
  
  assert.strictEqual(grid.normal.premenstrual.n, 2);
  assert.strictEqual(grid.normal.premenstrual.avg, "2.00"); // Dropped heavily in premenstrual

  assert.strictEqual(grid.rough.premenstrual.n, 1);
  assert.strictEqual(grid.rough.premenstrual.avg, "1.00");
});

test('Forecast Next Hard Window', (t) => {
  const starts = ['2023-11-01', '2023-10-04']; // 28 days difference exactly
  const window = forecastNextHardWindow(starts, 28);
  
  assert.strictEqual(window.isReliable, true);
  // Nov 1 + 21 days = Nov 22
  assert.strictEqual(window.start, '2023-11-22');
});
