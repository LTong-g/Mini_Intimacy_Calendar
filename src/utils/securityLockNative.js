import { NativeModules, Platform } from 'react-native';

const getSecurityLockModule = () => NativeModules.SecurityLockModule;

export const isSecurityLockNativeAvailable = () =>
  Platform.OS === 'android' && Boolean(getSecurityLockModule());

const requireSecurityLockModule = () => {
  const module = getSecurityLockModule();
  if (Platform.OS !== 'android' || !module) {
    throw new Error('当前环境不支持安全锁原生能力');
  }
  return module;
};

export const setLauncherMode = async (mode) => {
  return requireSecurityLockModule().setLauncherMode(mode);
};

export const getLauncherMode = async () => {
  const module = getSecurityLockModule();
  if (Platform.OS !== 'android' || !module) return 'normal';
  return module.getLauncherMode();
};

export const createPasswordCredential = async (password) => {
  return requireSecurityLockModule().createPasswordCredential(password);
};

export const verifyPasswordCredential = async (password, credential) => {
  const module = getSecurityLockModule();
  if (Platform.OS !== 'android' || !module) return false;
  return module.verifyPasswordCredential(
    password,
    credential.passwordSalt,
    credential.passwordHash,
    credential.passwordAlgorithm || 'legacy_sha256',
    credential.passwordIterations || 0
  );
};
