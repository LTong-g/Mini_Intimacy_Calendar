import pkg from '../../../package.json';

export const UPDATE_CHECK_RELEASES_URL =
  'https://api.github.com/repos/LTong-g/Mini_Intimacy_Calendar/releases/latest';

export const CURRENT_APP_VERSION = pkg.version;

const normalizeVersion = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^[vV]/, '');
};

export const compareSemanticVersions = (left, right) => {
  const leftParts = normalizeVersion(left).split('.').map((part) => Number(part));
  const rightParts = normalizeVersion(right).split('.').map((part) => Number(part));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightPart = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
};

const findAndroidApkAsset = (assets) => {
  if (!Array.isArray(assets)) return null;
  return assets.find((asset) => (
    typeof asset?.name === 'string'
    && asset.name.toLowerCase().endsWith('.apk')
    && typeof asset?.browser_download_url === 'string'
  )) || null;
};

export const checkForAppUpdate = async () => {
  const response = await fetch(UPDATE_CHECK_RELEASES_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub 返回状态 ${response.status}`);
  }

  const release = await response.json();
  const latestVersion = normalizeVersion(release?.tag_name);

  if (!latestVersion) {
    throw new Error('最新版本信息缺少版本号');
  }

  const apkAsset = findAndroidApkAsset(release?.assets);

  return {
    currentVersion: CURRENT_APP_VERSION,
    latestVersion,
    hasUpdate: compareSemanticVersions(latestVersion, CURRENT_APP_VERSION) > 0,
    releaseTitle: release?.name || `v${latestVersion}`,
    releaseNotes: release?.body || '',
    releaseUrl: release?.html_url || 'https://github.com/LTong-g/Mini_Intimacy_Calendar/releases',
    apkName: apkAsset?.name || '',
    apkUrl: apkAsset?.browser_download_url || '',
  };
};
