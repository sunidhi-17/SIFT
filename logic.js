// logic.js - Pure functions for Sift

/**
 * Calculates the day of the cycle based on cycle logs.
 * A cycle starts on day 1 (the first day of the period).
 * Premenstrual is defined as the final 7 days before the next expected cycle.
 * @param {Date} date The date to evaluate
 * @param {Array} cycleStarts Array of dates (strings or Date objects) denoting start of periods, sorted descending
 * @param {number} avgCycleLength Average cycle length in days (e.g. 28)
 * @returns {Object} { dayOfCycle: number, isPremenstrual: boolean }
 */
function getCyclePhase(date, cycleStarts, avgCycleLength = 28) {
  if (!cycleStarts || cycleStarts.length === 0) return { dayOfCycle: 0, isPremenstrual: false };
  const d = new Date(date);
  
  // Find the most recent start date before or equal to this date
  const starts = cycleStarts.map(s => new Date(s)).sort((a, b) => b - a);
  const currentStart = starts.find(s => s <= d);
  
  if (!currentStart) return { dayOfCycle: 0, isPremenstrual: false };

  const diffTime = Math.abs(d - currentStart);
  const dayOfCycle = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // day 1 is the start day

  // Calculate if premenstrual (last 7 days of the cycle)
  const daysRemaining = avgCycleLength - dayOfCycle;
  const isPremenstrual = daysRemaining >= 0 && daysRemaining < 7;

  return { dayOfCycle, isPremenstrual };
}

/**
 * Categorizes a day as "normal" or "rough life" based on sleep and stress.
 * @param {number} sleep 1 (worst) to 5 (best)
 * @param {number} stress 1 (lowest) to 5 (highest)
 * @returns {boolean} true if rough, false if normal
 */
function isRoughLifeDay(sleep, stress) {
  // A rough day is one where stress is very high or sleep is very low
  return sleep <= 2 || stress >= 4;
}

/**
 * Computes the 2x2 grid stats comparing premenstrual vs rest of cycle across normal vs rough life days.
 * @param {Array} entries Array of daily logs: { date, mood (1-5), sleep (1-5), stress (1-5) }
 * @param {Array} cycleStarts Same as above.
 * @param {number} avgCycleLength
 * @returns {Object} 2x2 grid of average mood and sample counts n
 */
function computeGridStats(entries, cycleStarts, avgCycleLength = 28) {
  const result = {
    normal: {
      premenstrual: { sum: 0, n: 0, avg: 0 },
      rest: { sum: 0, n: 0, avg: 0 },
    },
    rough: {
      premenstrual: { sum: 0, n: 0, avg: 0 },
      rest: { sum: 0, n: 0, avg: 0 },
    }
  };

  entries.forEach(entry => {
    const phase = getCyclePhase(entry.date, cycleStarts, avgCycleLength);
    const lifeType = isRoughLifeDay(entry.sleep, entry.stress) ? 'rough' : 'normal';
    const cycleType = phase.isPremenstrual ? 'premenstrual' : 'rest';

    result[lifeType][cycleType].sum += entry.mood;
    result[lifeType][cycleType].n += 1;
  });

  // Calculate averages
  for (const life of ['normal', 'rough']) {
    for (const cycle of ['premenstrual', 'rest']) {
      const cell = result[life][cycle];
      cell.avg = cell.n > 0 ? (cell.sum / cell.n).toFixed(2) : "--";
    }
  }

  return result;
}

/**
 * Predicts the next premenstrual window based on the most recent cycle start.
 * @param {Array} cycleStarts 
 * @param {number} avgCycleLength 
 * @returns {Object} { start: Date, end: Date, isReliable: boolean }
 */
function forecastNextHardWindow(cycleStarts, avgCycleLength = 28) {
    if (!cycleStarts || cycleStarts.length === 0) return null;
    const starts = cycleStarts.map(s => new Date(s)).sort((a, b) => b - a);
    const lastStart = starts[0];

    // Check reliability: If we have multiple and the variance is high, mark unreliable
    let isReliable = true;
    if (starts.length >= 2) {
      const diff1 = (starts[0] - starts[1]) / (1000 * 60 * 60 * 24);
      if (Math.abs(diff1 - avgCycleLength) > 5) {
        isReliable = false;
      }
    } else {
        isReliable = false; // need at least 2 cycles to be truly reliable for forecast
    }

    const windowStartDays = avgCycleLength - 7;
    const nextStart = new Date(lastStart);
    nextStart.setDate(nextStart.getDate() + windowStartDays);

    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 6); // 7 days inclusive

    return {
      start: nextStart.toISOString().split('T')[0],
      end: nextEnd.toISOString().split('T')[0],
      isReliable
    };
}

module.exports = {
  getCyclePhase,
  isRoughLifeDay,
  computeGridStats,
  forecastNextHardWindow
};
