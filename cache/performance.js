/**
 * This is a very quick and naive script to view the ongoing performance of mapCache and
 * basically see if it is actually useful.
 */

const perfInfoPerCacheKey = {};

function calcWeighted(entry) {
  return entry.nonCached / entry.sets;
}

function calcWeightedCached(entry) {
  return entry.cached / entry.sets;
}

function infoForCacheKey(cacheKey) {
  let info = { ...perfInfoPerCacheKey[cacheKey] };

  info.weighted = calcWeighted(perfInfoPerCacheKey[cacheKey]);
  info.cacheWeighted = calcWeightedCached(perfInfoPerCacheKey[cacheKey]);

  if (!info.misses) {
    info.ratio = Infinity;
  } else {
    info.ratio = info.hits / info.misses;
  }

  return info;
}

export default function (cacheKey, top = 10) {
  if (!cacheKey) {
    const fullInfo = ((perfInfoPerCacheKey) => {
      const fullInfo = [];
      for (var cacheKey in perfInfoPerCacheKey) {
        fullInfo.push([cacheKey, infoForCacheKey(cacheKey)]);
      }

      return fullInfo;
    })(perfInfoPerCacheKey);

    const slowest = fullInfo.sort((a, b) => a[1].nonCached - b[1].nonCached);

    const slowestW = fullInfo.sort(
      (a, b) => calcWeighted(a[1]) - calcWeighted(b[1])
    );

    const slowestCached = fullInfo.sort((a, b) => a[1].hits - b[1].hits);

    const slowestCW = fullInfo.sort(
      (a, b) => calcWeightedCached(a[1]) - calcWeightedCached(b[1])
    );

    const fastest = fullInfo.sort((a, b) => b[1].nonCached - a[1].nonCached);

    const fastestW = fullInfo.sort(
      (a, b) => calcWeighted(b[1]) - calcWeighted(a[1])
    );

    const fastestCached = fullInfo.sort((a, b) => b[1].cached - a[1].cached);

    const fastestCW = fullInfo.sort(
      (a, b) => calcWeightedCached(b[1]) - calcWeightedCached(a[1])
    );

    const hits = fullInfo.sort((a, b) => a[1].hits - b[1].hits);

    const misses = fullInfo.sort((a, b) => a[1].misses - b[1].misses);

    const gets = fullInfo.sort((a, b) => a[1].gets - b[1].gets);

    const sets = fullInfo.sort((a, b) => a[1].sets - b[1].sets);

    const ratios = fullInfo.sort((a, b) => {
      let aComp = a[1].misses ? a[1].ratio : a[1].hits,
        bComp = b[1].misses ? b[1].ratio : b[1].hits;

      return aComp - bComp;
    });

    return {
      totalSets: sets.reduce((total, [, { sets }]) => {
        total += sets;
      }, 0),
      totalGets: gets.reduce((total, [, { gets }]) => {
        total += gets;
      }, 0),
      totalHits: hits.reduce((total, [, { hits }]) => {
        total += hits;
      }, 0),
      totalMisses: misses.reduce((total, [, { misses }]) => {
        total += misses;
      }, 0),
      slowest: slowest.slice(0, top),
      slowestW: slowestW.slice(0, top),
      slowestCached: slowestCached.slice(0, top),
      slowestCW: slowestCW.slice(0, top),
      fastest: fastest.slice(0, top),
      fastestW: fastestW.slice(0, top),
      fastestCached: fastestCached.slice(0, top),
      fastestCW: fastestCW.slice(0, top),
      mostHits: hits.slice(0, top),
      mostMisses: misses.slice(0, top),
      mostGets: gets.slice(0, top),
      mostSets: sets.slice(0, top),
      bestRatios: ratios.slice(0, top),
    };
  } else {
    return infoForCacheKey(cacheKey);
  }
}
