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
      durationMs: Number.isFinite(item.durationMs)
        ? item.durationMs
        : item.endTime - item.startTime,
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

export const mergeAdjacentUsageIntervals = (intervals, gapMs = MERGE_GAP_MS) => {
  const normalized = normalizeIntervals(intervals)
    .sort((a, b) => (
      a.packageName.localeCompare(b.packageName) ||
      a.startTime - b.startTime ||
      a.endTime - b.endTime
    ));
  const merged = [];

  normalized.forEach((item) => {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.packageName === item.packageName &&
      item.startTime - last.endTime <= gapMs
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
