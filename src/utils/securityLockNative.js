import { NativeModules, Platform } from 'react-native';

const { SecurityLockModule } = NativeModules;

export const isSecurityLockNativeAvailable = () =>
  Platform.OS === 'android' && Boolean(SecurityLockModule);

export const setLauncherMode = async (mode) => {
  if (!isSecurityLockNativeAvailable()) {
    throw new Error('当前环境不支持安全锁原生能力');
  }
  return SecurityLockModule.setLauncherMode(mode);
};

export const getLauncherMode = async () => {
  if (!isSecurityLockNativeAvailable()) return 'normal';
  return SecurityLockModule.getLauncherMode();
};

export const createPasswordCredential = async (password) => {
  if (!isSecurityLockNativeAvailable()) {
    throw new Error('当前环境不支持安全锁原生能力');
  }
  return SecurityLockModule.createPasswordCredential(password);
};

export const verifyPasswordCredential = async (password, credential) => {
  if (!isSecurityLockNativeAvailable()) return false;
  return SecurityLockModule.verifyPasswordCredential(
    password,
    credential.passwordSalt,
    credential.passwordHash,
    credential.passwordAlgorithm || 'legacy_sha256',
    credential.passwordIterations || 0
  );
};
