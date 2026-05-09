import * as FileSystem from 'expo-file-system';
import {
  clearAllStoredAppData,
  normalizeMemosPayload,
  readMemosData,
  readSecurityLockData,
  writeMemosData,
  writeSecurityLockData,
} from './appDataStorage';
import {
  createPasswordCredential,
  getLauncherMode,
  setLauncherMode,
  verifyPasswordCredential,
} from './securityLockNative';

const TITLE_MAX_LENGTH = 20;
const MEMO_EXPORT_SCHEMA_VERSION = 1;

export const createLocalId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const buildTitleFromBody = (body, maxLength = TITLE_MAX_LENGTH) => {
  const firstLine = (body || '').split(/\r?\n/).find((line) => line.trim())?.trim() || '无标题';
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength)}...` : firstLine;
};

export const getSecurityLockState = readSecurityLockData;

export const synchronizeSecurityLockLauncherMode = async (state) => {
  const securityState = state || await readSecurityLockData();
  const targetMode = securityState.enabled ? 'memo' : 'normal';
  const currentMode = await getLauncherMode();
  if (currentMode !== targetMode) {
    await setLauncherMode(targetMode);
  }
  return securityState;
};

export const enableSecurityLock = async (password) => {
  const previousState = await readSecurityLockData();
  const previousLauncherMode = await getLauncherMode();
  const now = Date.now();
  const credential = await createPasswordCredential(password);
  const nextState = {
    ...previousState,
    ...credential,
    enabled: true,
    createdAt: previousState.enabled ? previousState.createdAt : now,
    updatedAt: now,
  };

  await writeSecurityLockData(nextState);
  try {
    await setLauncherMode('memo');
    return nextState;
  } catch (error) {
    await writeSecurityLockData(previousState);
    await setLauncherMode(previousLauncherMode).catch(() => {});
    throw error;
  }
};

export const disableSecurityLock = async () => {
  const currentState = await readSecurityLockData();
  const previousLauncherMode = await getLauncherMode();
  await setLauncherMode('normal');
  try {
    return await writeSecurityLockData({
      ...currentState,
      enabled: false,
      updatedAt: Date.now(),
    });
  } catch (error) {
    await setLauncherMode(previousLauncherMode).catch(() => {});
    throw error;
  }
};

export const verifyPassword = async (password) => {
  const state = await readSecurityLockData();
  if (!state.enabled || !state.passwordSalt || !state.passwordHash) return false;
  return verifyPasswordCredential(password, state);
};

export const getMemosState = readMemosData;

export const saveMemoNote = async ({ id, title, body, categoryId }) => {
  const current = await readMemosData();
  const now = Date.now();
  const normalizedTitle = (title || '').trim() || buildTitleFromBody(body);
  const note = {
    id: id || createLocalId('memo'),
    title: normalizedTitle,
    body: body || '',
    categoryId: categoryId || null,
    createdAt: id ? current.notes.find((item) => item.id === id)?.createdAt || now : now,
    updatedAt: now,
  };
  const notes = current.notes.filter((item) => item.id !== note.id);
  notes.unshift(note);
  return writeMemosData({ ...current, notes });
};

export const deleteMemoNote = async (id) => {
  const current = await readMemosData();
  return writeMemosData({
    ...current,
    notes: current.notes.filter((item) => item.id !== id),
  });
};

export const saveMemoCategory = async ({ id, name, color }) => {
  const current = await readMemosData();
  const now = Date.now();
  const category = {
    id: id || createLocalId('category'),
    name: name.trim(),
    color: color.toUpperCase(),
    createdAt: id ? current.categories.find((item) => item.id === id)?.createdAt || now : now,
    updatedAt: now,
  };
  const categories = current.categories.filter((item) => item.id !== category.id);
  categories.push(category);
  return writeMemosData({ ...current, categories });
};

export const exportMemoData = async () => {
  const memos = await readMemosData();
  return {
    schemaVersion: MEMO_EXPORT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    memos: {
      categories: memos.categories,
      notes: memos.notes,
    },
  };
};

export const normalizeMemoImportPayload = (raw) => {
  if (raw?.memos) return normalizeMemosPayload(raw.memos);
  return normalizeMemosPayload(raw);
};

export const mergeMemoData = async (incoming, conflictChoices = {}) => {
  const current = await readMemosData();
  const now = Date.now();
  const nextCategories = [...current.categories];
  const nextNotes = [...current.notes];
  const categoryIdMap = new Map();

  const findCopyName = (baseName) => {
    let index = 1;
    let nextName = `${baseName}(${index})`;
    const names = new Set(nextCategories.map((item) => item.name));
    while (names.has(nextName)) {
      index += 1;
      nextName = `${baseName}(${index})`;
    }
    return nextName;
  };

  incoming.categories.forEach((category) => {
    const sameName = nextCategories.find((item) => item.name === category.name);
    const choice = conflictChoices.categories?.[category.id] || (sameName ? 'merge' : 'add');
    if (sameName && choice === 'merge') {
      categoryIdMap.set(category.id, sameName.id);
      return;
    }
    const id = sameName || nextCategories.some((item) => item.id === category.id)
      ? createLocalId('category')
      : category.id;
    categoryIdMap.set(category.id, id);
    nextCategories.push({
      ...category,
      id,
      name: sameName ? findCopyName(category.name) : category.name,
      createdAt: category.createdAt || now,
      updatedAt: now,
    });
  });

  incoming.notes.forEach((note) => {
    const existingIndex = nextNotes.findIndex((item) => item.id === note.id);
    const choice = conflictChoices.notes?.[note.id] || (existingIndex >= 0 ? 'copy' : 'add');
    if (existingIndex >= 0 && choice === 'skip') return;
    const mappedCategoryId = note.categoryId ? categoryIdMap.get(note.categoryId) || note.categoryId : null;
    const nextNote = {
      ...note,
      id: existingIndex >= 0 && choice === 'copy' ? createLocalId('memo') : note.id,
      categoryId: nextCategories.some((item) => item.id === mappedCategoryId) ? mappedCategoryId : null,
      updatedAt: now,
    };
    if (existingIndex >= 0 && choice === 'replace') {
      nextNotes[existingIndex] = nextNote;
      return;
    }
    nextNotes.push(nextNote);
  });

  return writeMemosData({
    categories: nextCategories,
    notes: nextNotes,
  });
};

export const resetApplicationData = async () => {
  await clearAllStoredAppData();
  if (FileSystem.cacheDirectory) {
    try {
      await FileSystem.deleteAsync(FileSystem.cacheDirectory, { idempotent: true });
    } catch {}
  }
};
