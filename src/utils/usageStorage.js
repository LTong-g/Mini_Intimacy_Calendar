import {
  readBlacklistData,
  updateBlacklistData,
  writeBlacklistData,
  normalizeUsageApps,
  normalizeUsageIntervalsPayload,
} from './appDataStorage';

const MERGE_GAP_MS = 2 * 60 * 1000;

const normalizeBlacklist = (value) => Object.values(normalizeUsageApps(value));

const sortAppsByLabel = (apps) => [...apps].sort((a, b) => (
  a.label.localeCompare(b.label) || a.packageName.localeCompare(b.packageName)
));

const getPeriodEnd = (period) => (
  period.endAt === null || period.endAt === undefined ? Number.POSITIVE_INFINITY : period.endAt
);

const isPeriodActiveAt = (period, time = Date.now()) => (
  period.startAt <= time && getPeriodEnd(period) > time
);

const getActiveBlacklistApps = (blacklist, time = Date.now()) => {
  const activePackages = new Set(
    blacklist.periods
      .filter((period) => isPeriodActiveAt(period, time))
      .map((period) => period.packageName)
  );

  return sortAppsByLabel(
    Array.from(activePackages)
      .map((packageName) => blacklist.appsByPackage[packageName] || {
        packageName,
        label: packageName,
        icon: null,
        color: null,
        installed: false,
      })
  );
};

const upsertApps = (blacklist, apps, options = {}) => {
  const now = options.now || Date.now();
  const installed = options.installed !== false;
  const nextAppsByPackage = { ...blacklist.appsByPackage };

  normalizeBlacklist(apps).forEach((app) => {
    const previous = nextAppsByPackage[app.packageName];
    nextAppsByPackage[app.packageName] = {
      packageName: app.packageName,
      label: app.label,
      icon: app.icon,
      color: app.color,
      firstSeenAt: previous?.firstSeenAt ?? now,
      lastSeenAt: now,
      installed,
    };
  });

  return {
    ...blacklist,
    appsByPackage: nextAppsByPackage,
  };
};

const getHistoricalPackages = (blacklist) => new Set([
  ...blacklist.periods.map((period) => period.packageName),
  ...blacklist.intervals.map((interval) => interval.packageName),
]);

const closeActivePeriods = (periods, packageNames, endReason, endAt = Date.now()) => {
  const targetPackages = new Set(packageNames);
  return periods.map((period) => {
    if (!targetPackages.has(period.packageName) || !isPeriodActiveAt(period, endAt)) {
      return period;
    }
    return {
      ...period,
      endAt,
      endReason,
    };
  });
};

const openMissingPeriods = (periods, packageNames, startAt = Date.now()) => {
  const activePackages = new Set(
    periods
      .filter((period) => isPeriodActiveAt(period, startAt))
      .map((period) => period.packageName)
  );
  const nextPeriods = [...periods];
  packageNames.forEach((packageName) => {
    if (activePackages.has(packageName)) return;
    nextPeriods.push({
      packageName,
      startAt,
      endAt: null,
      endReason: null,
    });
  });
  return nextPeriods;
};

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
  const normalized = normalizeUsageIntervalsPayload(intervals);
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
  const blacklist = await readBlacklistData();
  return getActiveBlacklistApps(blacklist);
};

export const getExperimentalUsageKnownApps = async () => {
  const blacklist = await readBlacklistData();
  return sortAppsByLabel(Object.values(blacklist.appsByPackage));
};

export const setExperimentalUsageBlacklist = async (apps) => {
  const now = Date.now();
  const desiredApps = normalizeBlacklist(apps);
  const desiredPackages = new Set(desiredApps.map((app) => app.packageName));
  const next = await updateBlacklistData((current) => {
    const withApps = upsertApps(current, desiredApps, { now, installed: true });
    const activePackages = new Set(
      withApps.periods
        .filter((period) => isPeriodActiveAt(period, now))
        .map((period) => period.packageName)
    );
    const packagesToClose = Array.from(activePackages)
      .filter((packageName) => !desiredPackages.has(packageName));

    return {
      ...withApps,
      periods: openMissingPeriods(
        closeActivePeriods(withApps.periods, packagesToClose, 'manual', now),
        desiredPackages,
        now
      ),
    };
  });

  return getActiveBlacklistApps(next, now);
};

export const syncExperimentalUsageBlacklistMetadata = async (blacklist, launchableApps) => {
  const now = Date.now();
  const launchable = normalizeBlacklist(launchableApps);
  const launchablePackages = new Set(launchable.map((app) => app.packageName));
  const launchableByPackage = new Map(launchable.map((app) => [app.packageName, app]));
  const next = await updateBlacklistData((current) => {
    const historicalPackages = getHistoricalPackages(current);
    const appsToRefresh = Array.from(historicalPackages)
      .map((packageName) => launchableByPackage.get(packageName))
      .filter(Boolean);
    const withApps = upsertApps(current, appsToRefresh, { now, installed: true });
    const nextAppsByPackage = {};
    historicalPackages.forEach((packageName) => {
      const existing = withApps.appsByPackage[packageName];
      if (existing) {
        nextAppsByPackage[packageName] = existing;
      } else {
        nextAppsByPackage[packageName] = {
          packageName,
          label: packageName,
          icon: null,
          color: null,
          firstSeenAt: now,
          lastSeenAt: now,
          installed: false,
        };
      }
    });
    Object.keys(nextAppsByPackage).forEach((packageName) => {
      if (!launchablePackages.has(packageName)) {
        nextAppsByPackage[packageName] = {
          ...nextAppsByPackage[packageName],
          installed: false,
        };
      }
    });

    const activePackages = withApps.periods
      .filter((period) => isPeriodActiveAt(period, now))
      .map((period) => period.packageName);
    const uninstalledActivePackages = activePackages
      .filter((packageName) => !launchablePackages.has(packageName));

    return {
      ...withApps,
      appsByPackage: nextAppsByPackage,
      periods: closeActivePeriods(
        withApps.periods,
        uninstalledActivePackages,
        'uninstalled',
        now
      ),
    };
  });

  return getActiveBlacklistApps(next, now);
};

export const getExperimentalUsageIntervals = async () => {
  const blacklist = await readBlacklistData();
  return normalizeUsageIntervalsPayload(blacklist.intervals);
};

export const clearExperimentalUsageIntervals = async () => {
  const current = await readBlacklistData();
  await writeBlacklistData({
    ...current,
    intervals: [],
    refreshState: {},
  });
};
