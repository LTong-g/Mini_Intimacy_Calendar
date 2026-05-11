import AsyncStorage from '@react-native-async-storage/async-storage';
import pkg from '../../../package.json';

export const APP_DATA_SCHEMA_VERSION = 3;
const APP_DATA_IMPORT_SCHEMA_VERSIONS = new Set([2, APP_DATA_SCHEMA_VERSION]);

export const APP_DATA_KEYS = {
  CHECKINS: 'app_data_checkins',
  BLACKLIST: 'app_data_blacklist',
  SETTINGS: 'app_data_settings',
  MEMOS: 'app_data_memos',
  SECURITY_LOCK: 'app_data_security_lock',
  META: 'app_data_meta',
};

export const LEGACY_DATA_KEYS = {
  CHECKINS: 'checkin_status',
  BLACKLIST: 'experimental_usage_blacklist',
  INTERVALS: 'experimental_usage_intervals',
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const LEGACY_SECURITY_LOCK_FIELDS = {
  PASSWORD_SALT: 'triggerSalt',
  PASSWORD_HASH: 'triggerHash',
};
let migrationPromise = null;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const safeParse = (stored, fallback) => {
  if (!stored) return fallback;
  try {
    return JSON.parse(stored);
  } catch {
    return fallback;
  }
};

const normalizeCount = (value, strict = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    if (strict) throw new Error('记录次数必须是数字');
    return 0;
  }
  if (!Number.isInteger(value) || value < 0) {
    if (strict) throw new Error('记录次数必须是非负整数');
    return Math.max(0, Math.floor(value));
  }
  return value;
};

const emptyCheckInRecord = () => ({
  tutorial: 0,
  weapon: 0,
  duo: 0,
});

const hasAnyCheckIn = (record) =>
  record.tutorial > 0 || record.weapon > 0 || record.duo > 0;

const bitmaskToCheckInRecord = (status) => {
  const flag = typeof status === 'number' ? status : parseInt(status, 10) || 0;
  return {
    tutorial: flag & 1 ? 1 : 0,
    weapon: flag & 2 ? 1 : 0,
    duo: flag & 4 ? 1 : 0,
  };
};

export const normalizeCheckinsPayload = (raw, options = {}) => {
  const { strict = false } = options;
  const source = isPlainObject(raw) && isPlainObject(raw.recordsByDate)
    ? raw.recordsByDate
    : raw;

  if (!isPlainObject(source)) {
    if (strict) throw new Error('数据格式必须是对象');
    return { schemaVersion: APP_DATA_SCHEMA_VERSION, recordsByDate: {} };
  }

  const recordsByDate = {};
  Object.entries(source).forEach(([dateStr, value]) => {
    if (!DATE_KEY_RE.test(dateStr)) {
      if (strict) throw new Error('日期格式必须为YYYY-MM-DD');
      return;
    }

    let record = emptyCheckInRecord();
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0 || value > 7) {
        if (strict) throw new Error('旧格式记录值必须是0到7之间的整数');
      } else {
        record = bitmaskToCheckInRecord(value);
      }
    } else if (isPlainObject(value)) {
      record = {
        tutorial: normalizeCount(value.tutorial, strict),
        weapon: normalizeCount(value.weapon, strict),
        duo: normalizeCount(value.duo, strict),
      };
    } else if (strict) {
      throw new Error('记录值格式无效');
    }

    if (hasAnyCheckIn(record)) {
      recordsByDate[dateStr] = record;
    }
  });

  return {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    recordsByDate,
  };
};

const normalizeApp = (value, now = Date.now()) => {
  if (!value || typeof value.packageName !== 'string' || !value.packageName.trim()) {
    return null;
  }
  const packageName = value.packageName.trim();
  const firstSeenAt = Number.isFinite(value.firstSeenAt) ? value.firstSeenAt : now;
  const lastSeenAt = Number.isFinite(value.lastSeenAt) ? value.lastSeenAt : firstSeenAt;
  return {
    packageName,
    label: typeof value.label === 'string' && value.label.trim()
      ? value.label.trim()
      : packageName,
    icon: typeof value.icon === 'string' && value.icon.trim() ? value.icon.trim() : null,
    color: typeof value.color === 'string' && COLOR_RE.test(value.color.trim())
      ? value.color.trim().toUpperCase()
      : null,
    firstSeenAt,
    lastSeenAt,
    installed: value.installed !== false,
  };
};

export const normalizeUsageApps = (value, now = Date.now()) => {
  const appsByPackage = {};
  const source = Array.isArray(value)
    ? value
    : isPlainObject(value)
      ? Object.values(value)
      : [];

  source.forEach((item) => {
    const app = normalizeApp(item, now);
    if (app) appsByPackage[app.packageName] = app;
  });

  return appsByPackage;
};

const normalizePeriod = (value) => {
  if (!value || typeof value.packageName !== 'string' || !value.packageName.trim()) {
    return null;
  }
  const startAt = Number(value.startAt);
  const endAt = value.endAt === null || value.endAt === undefined ? null : Number(value.endAt);
  if (!Number.isFinite(startAt)) return null;
  if (endAt !== null && (!Number.isFinite(endAt) || endAt <= startAt)) return null;
  const endReason = endAt === null
    ? null
    : (typeof value.endReason === 'string' && value.endReason.trim()
      ? value.endReason.trim()
      : 'manual');
  return {
    packageName: value.packageName.trim(),
    startAt,
    endAt,
    endReason,
  };
};

const normalizeInterval = (value) => {
  if (!value || typeof value.packageName !== 'string' || !value.packageName.trim()) {
    return null;
  }
  const startTime = Number(value.startTime);
  const endTime = Number(value.endTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }
  return {
    packageName: value.packageName.trim(),
    startTime,
    endTime,
    durationMs: endTime - startTime,
  };
};

export const normalizeUsageIntervalsPayload = (value) => (
  (Array.isArray(value) ? value : [])
    .map(normalizeInterval)
    .filter(Boolean)
);

export const normalizeBlacklistPayload = (raw, now = Date.now()) => {
  const source = isPlainObject(raw) ? raw : {};
  const periods = (Array.isArray(source.periods) ? source.periods : [])
    .map(normalizePeriod)
    .filter(Boolean)
    .sort((a, b) => a.startAt - b.startAt || a.packageName.localeCompare(b.packageName));
  const intervals = normalizeUsageIntervalsPayload(source.intervals)
    .sort((a, b) => a.startTime - b.startTime || a.packageName.localeCompare(b.packageName));
  const sourceAppsByPackage = normalizeUsageApps(source.appsByPackage, now);
  const historicalPackages = new Set([
    ...periods.map((period) => period.packageName),
    ...intervals.map((interval) => interval.packageName),
  ]);
  const appsByPackage = {};

  historicalPackages.forEach((packageName) => {
    if (sourceAppsByPackage[packageName]) {
      appsByPackage[packageName] = sourceAppsByPackage[packageName];
    }
  });

  intervals.forEach((interval) => {
    if (!appsByPackage[interval.packageName]) {
      appsByPackage[interval.packageName] = {
        packageName: interval.packageName,
        label: interval.packageName,
        icon: null,
        color: null,
        firstSeenAt: interval.startTime,
        lastSeenAt: interval.endTime,
        installed: false,
      };
    }
  });

  return {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    appsByPackage,
    periods,
    intervals,
    refreshState: isPlainObject(source.refreshState) ? source.refreshState : {},
  };
};

const normalizeSettingsPayload = (raw) => ({
  schemaVersion: APP_DATA_SCHEMA_VERSION,
  usageAccess: isPlainObject(raw?.usageAccess) ? raw.usageAccess : {},
  ui: isPlainObject(raw?.ui) ? raw.ui : {},
});

const normalizeMemoCategory = (value, now = Date.now()) => {
  if (!isPlainObject(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;
  const id = typeof value.id === 'string' && value.id.trim()
    ? value.id.trim()
    : `category_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const color = typeof value.color === 'string' && COLOR_RE.test(value.color.trim())
    ? value.color.trim().toUpperCase()
    : '#8E8E93';
  const createdAt = Number.isFinite(value.createdAt) ? value.createdAt : now;
  const updatedAt = Number.isFinite(value.updatedAt) ? value.updatedAt : createdAt;
  return {
    id,
    name,
    color,
    createdAt,
    updatedAt,
  };
};

const normalizeMemoNote = (value, validCategoryIds, now = Date.now()) => {
  if (!isPlainObject(value)) return null;
  const body = typeof value.body === 'string' ? value.body : '';
  const title = typeof value.title === 'string' ? value.title : '';
  if (!title.trim() && !body.trim()) return null;
  const id = typeof value.id === 'string' && value.id.trim()
    ? value.id.trim()
    : `memo_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const categoryId = typeof value.categoryId === 'string' && validCategoryIds.has(value.categoryId)
    ? value.categoryId
    : null;
  const createdAt = Number.isFinite(value.createdAt) ? value.createdAt : now;
  const updatedAt = Number.isFinite(value.updatedAt) ? value.updatedAt : createdAt;
  return {
    id,
    title,
    body,
    categoryId,
    createdAt,
    updatedAt,
  };
};

export const normalizeMemosPayload = (raw, now = Date.now()) => {
  const source = isPlainObject(raw) ? raw : {};
  const categories = (Array.isArray(source.categories) ? source.categories : [])
    .map((item) => normalizeMemoCategory(item, now))
    .filter(Boolean);
  const categoryIds = new Set(categories.map((item) => item.id));
  const notes = (Array.isArray(source.notes) ? source.notes : [])
    .map((item) => normalizeMemoNote(item, categoryIds, now))
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);

  return {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    categories,
    notes,
  };
};

export const normalizeSecurityLockPayload = (raw, now = Date.now()) => {
  const source = isPlainObject(raw) ? raw : {};
  const passwordSalt = typeof source.passwordSalt === 'string'
    ? source.passwordSalt
    : typeof source[LEGACY_SECURITY_LOCK_FIELDS.PASSWORD_SALT] === 'string'
      ? source[LEGACY_SECURITY_LOCK_FIELDS.PASSWORD_SALT]
      : null;
  const passwordHash = typeof source.passwordHash === 'string'
    ? source.passwordHash
    : typeof source[LEGACY_SECURITY_LOCK_FIELDS.PASSWORD_HASH] === 'string'
      ? source[LEGACY_SECURITY_LOCK_FIELDS.PASSWORD_HASH]
      : null;
  return {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    enabled: source.enabled === true && Boolean(passwordSalt && passwordHash),
    passwordSalt,
    passwordHash,
    passwordAlgorithm: typeof source.passwordAlgorithm === 'string'
      ? source.passwordAlgorithm
      : passwordSalt && passwordHash
        ? 'legacy_sha256'
        : null,
    passwordIterations: Number.isFinite(source.passwordIterations) ? source.passwordIterations : 0,
    createdAt: Number.isFinite(source.createdAt) ? source.createdAt : now,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : now,
  };
};

const normalizeMetaPayload = (raw, now = Date.now()) => ({
  schemaVersion: APP_DATA_SCHEMA_VERSION,
  createdAt: Number.isFinite(raw?.createdAt) ? raw.createdAt : now,
  updatedAt: now,
  migratedFrom: raw?.migratedFrom ?? null,
  migrationCompletedAt: raw?.migrationCompletedAt ?? null,
});

const readJson = async (key, fallback) => {
  const stored = await AsyncStorage.getItem(key);
  return safeParse(stored, fallback);
};

const writeJson = async (key, value) => {
  const serialized = JSON.stringify(value);
  try {
    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    if (key !== APP_DATA_KEYS.BLACKLIST) {
      throw error;
    }
    await AsyncStorage.removeItem(key);
    await AsyncStorage.setItem(key, serialized);
  }
};

const buildLegacyBlacklistPayload = (legacyBlacklist, legacyIntervals, now) => {
  const appsByPackage = normalizeUsageApps(legacyBlacklist, now);
  const intervals = normalizeUsageIntervalsPayload(legacyIntervals);
  const intervalsByPackage = new Map();

  intervals.forEach((interval) => {
    const range = intervalsByPackage.get(interval.packageName) || {
      startAt: interval.startTime,
      endAt: interval.endTime,
    };
    range.startAt = Math.min(range.startAt, interval.startTime);
    range.endAt = Math.max(range.endAt, interval.endTime);
    intervalsByPackage.set(interval.packageName, range);

    if (!appsByPackage[interval.packageName]) {
      appsByPackage[interval.packageName] = {
        packageName: interval.packageName,
        label: interval.packageName,
        icon: null,
        color: null,
        firstSeenAt: interval.startTime,
        lastSeenAt: interval.endTime,
        installed: false,
      };
    }
  });

  const activePackages = new Set(Object.keys(normalizeUsageApps(legacyBlacklist, now)));
  const periods = [];
  activePackages.forEach((packageName) => {
    const range = intervalsByPackage.get(packageName);
    periods.push({
      packageName,
      startAt: range?.startAt ?? now,
      endAt: null,
      endReason: null,
    });
  });

  intervalsByPackage.forEach((range, packageName) => {
    if (activePackages.has(packageName)) return;
    periods.push({
      packageName,
      startAt: range.startAt,
      endAt: range.endAt,
      endReason: 'legacy',
    });
  });

  return normalizeBlacklistPayload({
    appsByPackage,
    periods,
    intervals,
    refreshState: {},
  }, now);
};

const migrateIfNeeded = async () => {
  const now = Date.now();
  const existingMeta = await readJson(APP_DATA_KEYS.META, null);
  if (existingMeta?.schemaVersion === APP_DATA_SCHEMA_VERSION) {
    return;
  }

  const [
    existingCheckins,
    existingBlacklist,
    existingSettings,
    existingMemos,
    existingSecurityLock,
    legacyCheckins,
    legacyBlacklist,
    legacyIntervals,
  ] = await Promise.all([
    readJson(APP_DATA_KEYS.CHECKINS, null),
    readJson(APP_DATA_KEYS.BLACKLIST, null),
    readJson(APP_DATA_KEYS.SETTINGS, null),
    readJson(APP_DATA_KEYS.MEMOS, null),
    readJson(APP_DATA_KEYS.SECURITY_LOCK, null),
    readJson(LEGACY_DATA_KEYS.CHECKINS, {}),
    readJson(LEGACY_DATA_KEYS.BLACKLIST, []),
    readJson(LEGACY_DATA_KEYS.INTERVALS, []),
  ]);

  const checkins = existingCheckins
    ? normalizeCheckinsPayload(existingCheckins)
    : normalizeCheckinsPayload(legacyCheckins);
  const blacklist = existingBlacklist
    ? normalizeBlacklistPayload(existingBlacklist, now)
    : buildLegacyBlacklistPayload(legacyBlacklist, legacyIntervals, now);
  const settings = normalizeSettingsPayload(existingSettings || {});
  const memos = normalizeMemosPayload(existingMemos || {}, now);
  const securityLock = normalizeSecurityLockPayload(existingSecurityLock || {}, now);
  const meta = normalizeMetaPayload({
    ...(existingMeta || {}),
    migratedFrom: existingMeta?.schemaVersion ?? 1,
    migrationCompletedAt: now,
  }, now);

  await Promise.all([
    writeJson(APP_DATA_KEYS.CHECKINS, checkins),
    writeJson(APP_DATA_KEYS.BLACKLIST, blacklist),
    writeJson(APP_DATA_KEYS.SETTINGS, settings),
    writeJson(APP_DATA_KEYS.MEMOS, memos),
    writeJson(APP_DATA_KEYS.SECURITY_LOCK, securityLock),
    writeJson(APP_DATA_KEYS.META, meta),
  ]);
};

export const ensureAppDataMigrated = async () => {
  if (!migrationPromise) {
    migrationPromise = migrateIfNeeded().finally(() => {
      migrationPromise = null;
    });
  }
  return migrationPromise;
};

export const readCheckinsData = async () => {
  await ensureAppDataMigrated();
  return normalizeCheckinsPayload(await readJson(APP_DATA_KEYS.CHECKINS, {}));
};

export const writeCheckinsData = async (recordsByDate) => {
  await ensureAppDataMigrated();
  const payload = normalizeCheckinsPayload(recordsByDate);
  await writeJson(APP_DATA_KEYS.CHECKINS, payload);
  await touchMeta();
  return payload;
};

export const readBlacklistData = async () => {
  await ensureAppDataMigrated();
  return normalizeBlacklistPayload(await readJson(APP_DATA_KEYS.BLACKLIST, {}));
};

export const readSettingsData = async () => {
  await ensureAppDataMigrated();
  return normalizeSettingsPayload(await readJson(APP_DATA_KEYS.SETTINGS, {}));
};

export const writeSettingsData = async (settings) => {
  await ensureAppDataMigrated();
  const payload = normalizeSettingsPayload(settings);
  await writeJson(APP_DATA_KEYS.SETTINGS, payload);
  await touchMeta();
  return payload;
};

export const readMemosData = async () => {
  await ensureAppDataMigrated();
  return normalizeMemosPayload(await readJson(APP_DATA_KEYS.MEMOS, {}));
};

export const writeMemosData = async (memos) => {
  await ensureAppDataMigrated();
  const payload = normalizeMemosPayload(memos);
  await writeJson(APP_DATA_KEYS.MEMOS, payload);
  await touchMeta();
  return payload;
};

export const readSecurityLockData = async () => {
  await ensureAppDataMigrated();
  return normalizeSecurityLockPayload(await readJson(APP_DATA_KEYS.SECURITY_LOCK, {}));
};

export const writeSecurityLockData = async (securityLock) => {
  await ensureAppDataMigrated();
  const payload = normalizeSecurityLockPayload(securityLock);
  await writeJson(APP_DATA_KEYS.SECURITY_LOCK, payload);
  await touchMeta();
  return payload;
};

export const clearAllStoredAppData = async () => {
  await AsyncStorage.multiRemove([
    APP_DATA_KEYS.CHECKINS,
    APP_DATA_KEYS.BLACKLIST,
    APP_DATA_KEYS.SETTINGS,
    APP_DATA_KEYS.MEMOS,
    APP_DATA_KEYS.SECURITY_LOCK,
    APP_DATA_KEYS.META,
    LEGACY_DATA_KEYS.CHECKINS,
    LEGACY_DATA_KEYS.BLACKLIST,
    LEGACY_DATA_KEYS.INTERVALS,
  ]);
};

const touchMeta = async () => {
  const now = Date.now();
  const current = normalizeMetaPayload(await readJson(APP_DATA_KEYS.META, {}), now);
  await writeJson(APP_DATA_KEYS.META, {
    ...current,
    updatedAt: now,
  });
};

export const exportAppData = async () => {
  await ensureAppDataMigrated();
  const now = Date.now();
  const [checkins, blacklist, settings, memos, meta] = await Promise.all([
    readCheckinsData(),
    readBlacklistData(),
    readSettingsData(),
    readMemosData(),
    readJson(APP_DATA_KEYS.META, {}),
  ]);

  return {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    exportedAt: now,
    appVersion: pkg.version,
    checkins: { recordsByDate: checkins.recordsByDate },
    blacklist: {
      appsByPackage: blacklist.appsByPackage,
      periods: blacklist.periods,
      intervals: blacklist.intervals,
      refreshState: blacklist.refreshState,
    },
    settings: {
      usageAccess: settings.usageAccess,
      ui: settings.ui,
    },
    memos: {
      categories: memos.categories,
      notes: memos.notes,
    },
    meta: normalizeMetaPayload(meta, now),
  };
};

export const isAppDataEmpty = (appData) => (
  Object.keys(appData.checkins?.recordsByDate || {}).length === 0 &&
  Object.keys(appData.blacklist?.appsByPackage || {}).length === 0 &&
  (appData.blacklist?.periods || []).length === 0 &&
  (appData.blacklist?.intervals || []).length === 0 &&
  (appData.memos?.categories || []).length === 0 &&
  (appData.memos?.notes || []).length === 0
);

export const importAppData = async (raw) => {
  await ensureAppDataMigrated();
  const now = Date.now();

  if (isPlainObject(raw) && APP_DATA_IMPORT_SCHEMA_VERSIONS.has(raw.schemaVersion)) {
    const checkins = normalizeCheckinsPayload(raw.checkins, { strict: true });
    const blacklist = normalizeBlacklistPayload(raw.blacklist, now);
    const settings = normalizeSettingsPayload(raw.settings || {});
    const memos = normalizeMemosPayload(raw.memos || {}, now);
    const meta = normalizeMetaPayload({
      ...(raw.meta || {}),
      updatedAt: now,
    }, now);

    await Promise.all([
      writeJson(APP_DATA_KEYS.CHECKINS, checkins),
      writeJson(APP_DATA_KEYS.BLACKLIST, blacklist),
      writeJson(APP_DATA_KEYS.SETTINGS, settings),
      writeJson(APP_DATA_KEYS.MEMOS, memos),
      writeJson(APP_DATA_KEYS.META, meta),
    ]);

    return { format: 'appData', checkins, blacklist, settings, memos };
  }

  const checkins = normalizeCheckinsPayload(raw, { strict: true });
  await writeJson(APP_DATA_KEYS.CHECKINS, checkins);
  await touchMeta();
  return { format: 'legacyCheckins', checkins };
};
