import { NativeModules, Platform } from 'react-native';

const { UpdatePackageModule } = NativeModules;

export const isUpdatePackageNativeAvailable = () =>
  Platform.OS === 'android' && Boolean(UpdatePackageModule);

export const getDownloadedUpdatePackage = async () => {
  if (!isUpdatePackageNativeAvailable()) return null;
  return UpdatePackageModule.getDownloadedUpdate();
};

export const downloadUpdatePackage = async ({ downloadUrl, fileName, expectedVersion }) => {
  if (!isUpdatePackageNativeAvailable()) {
    throw new Error('当前安装包不支持应用内下载更新');
  }
  return UpdatePackageModule.downloadUpdate(downloadUrl, fileName || '', expectedVersion || '');
};

export const installUpdatePackage = async (fileName) => {
  if (!isUpdatePackageNativeAvailable()) {
    throw new Error('当前安装包不支持应用内安装更新');
  }
  return UpdatePackageModule.installUpdate(fileName);
};

export const deleteDownloadedUpdatePackage = async (fileName) => {
  if (!isUpdatePackageNativeAvailable()) return false;
  return UpdatePackageModule.deleteDownloadedUpdate(fileName);
};
