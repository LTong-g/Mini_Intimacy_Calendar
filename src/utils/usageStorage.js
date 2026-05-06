import AsyncStorage from '@react-native-async-storage/async-storage';

const BLACKLIST_KEY = 'experimental_usage_blacklist';
const INTERVALS_KEY = 'experimental_usage_intervals';
const MERGE_GAP_MS = 2 * 60 * 1000;

const normalizeBlacklist = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.packageName === 'string')
    .map((item) => ({
      packageName: item.packageName,
      label: typeof item.label === 'string' && item.label.trim()
        ? item.label.trim()
        : item.packageName,
      icon: typeof item.icon === 'string' && item.icon.trim()
        ? item.icon.trim()
        : null,
      color: typeof item.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(item.color.trim())
        ? item.color.trim().toUpperCase()
        : null,
    }));
};

const normalizeIntervals = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => (
      item &&
      typeof item.packageName === 'string' &&
      Number.isFinite(item.startTime) &&
      Number.isFinite(item.endTime) &&
      item.endTime > item.startTime
    ))
    .map((item) => ({
      packageName: item.packageName,
      startTime: item.startTime,
      endTime: item.endTime,
      durationMs: item.endTime - item.startTime,
    }));
};

const hydrateExperimentalUsageBlacklist = (blacklist, launchableApps) => {
  const launchableByPackage = new Map(
    normalizeBlacklist(launchableApps).map((app) => [app.packageName, app])
  );

  return normalizeBlacklist(blacklist).map((app) => {
    const launchableApp = launchableByPackage.get(app.packageName);
    return {
      ...app,
      label: app.label || launchableApp?.label || app.packageName,
      icon: app.icon || launchableApp?.icon || null,
      color: launchableApp?.color || app.color || null,
    };
  });
};

const areBlacklistsEqual = (left, right) => (
  JSON.stringify(normalizeBlacklist(left)) === JSON.stringify(normalizeBlacklist(right))
);

const buildNonOverlappingSegments = (intervals) => {
  const boundaries = Array.from(new Set(
    intervals.flatMap((item) => [item.startTime, item.endTime])
  )).sort((a, b) => a - b);
  const segments = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startTime = boundaries[index];
    const endTime = boundaries[index + 1];
    if (endTime <= startTime) continue;

    const active = intervals.filter((item) => (
      item.startTime < endTime && item.endTime > startTime
    ));
    if (active.length === 0) continue;

    const winner = active.sort((a, b) => (
      b.startTime - a.startTime ||
      (a.endTime - a.startTime) - (b.endTime - b.startTime) ||
      a.packageName.localeCompare(b.packageName)
    ))[0];
    const last = segments[segments.length - 1];
    if (last && last.packageName === winner.packageName && last.endTime === startTime) {
      last.endTime = endTime;
      last.durationMs = last.endTime - last.startTime;
    } else {
      segments.push({
        packageName: winner.packageName,
        startTime,
        endTime,
        durationMs: endTime - startTime,
      });
    }
  }

  return segments;
};

const hasDifferentPackageUsageBetween = (segments, packageName, startTime, endTime) => {
  if (endTime <= startTime) return false;
  return segments.some((item) => (
    item.packageName !== packageName &&
    item.startTime < endTime &&
    item.endTime > startTime
  ));
};

export const mergeAdjacentUsageIntervals = (intervals, gapMs = MERGE_GAP_MS) => {
  const normalized = normalizeIntervals(intervals);
  const segments = buildNonOverlappingSegments(normalized);
  const sorted = segments
    .sort((a, b) => (
      a.packageName.localeCompare(b.packageName) ||
      a.startTime - b.startTime ||
      a.endTime - b.endTime
    ));
  const merged = [];

  sorted.forEach((item) => {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.packageName === item.packageName &&
      item.startTime - last.endTime <= gapMs &&
      !hasDifferentPackageUsageBetween(segments, item.packageName, last.endTime, item.startTime)
    ) {
      last.endTime = Math.max(last.endTime, item.endTime);
      last.durationMs = last.endTime - last.startTime;
      return;
    }

    merged.push({ ...item, durationMs: item.endTime - item.startTime });
  });

  return merged.sort((a, b) => a.startTime - b.startTime || a.packageName.localeCompare(b.packageName));
};

export const getExperimentalUsageBlacklist = async () => {
  const stored = await AsyncStorage.getItem(BLACKLIST_KEY);
  return normalizeBlacklist(stored ? JSON.parse(stored) : []);
};

export const setExperimentalUsageBlacklist = async (apps) => {
  const next = normalizeBlacklist(apps);
  await AsyncStorage.setItem(BLACKLIST_KEY, JSON.stringify(next));
  return next;
};

export const syncExperimentalUsageBlacklistMetadata = async (blacklist, launchableApps) => {
  const hydrated = hydrateExperimentalUsageBlacklist(blacklist, launchableApps);
  if (areBlacklistsEqual(blacklist, hydrated)) {
    return hydrated;
  }
  return setExperimentalUsageBlacklist(hydrated);
};

export const getExperimentalUsageIntervals = async () => {
  const stored = await AsyncStorage.getItem(INTERVALS_KEY);
  return normalizeIntervals(stored ? JSON.parse(stored) : []);
};

export const saveExperimentalUsageIntervals = async (intervals) => {
  const normalized = normalizeIntervals(intervals);
  const byIdentity = new Map();
  normalized.forEach((item) => {
    byIdentity.set(`${item.packageName}:${item.startTime}:${item.endTime}`, item);
  });
  const next = mergeAdjacentUsageIntervals(Array.from(byIdentity.values()));
  await AsyncStorage.setItem(INTERVALS_KEY, JSON.stringify(next));
  return next;
};

export const mergeExperimentalUsageIntervals = async (intervals) => {
  const existing = await getExperimentalUsageIntervals();
  return saveExperimentalUsageIntervals([...existing, ...intervals]);
};

export const clearExperimentalUsageIntervals = async () => {
  await AsyncStorage.removeItem(INTERVALS_KEY);
};
