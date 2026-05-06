import { getLaunchableApplications } from './usageAccessNative';

let cachedLaunchableApplications = null;

export const getCachedLaunchableApplications = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && cachedLaunchableApplications) {
    return cachedLaunchableApplications;
  }

  const nextApps = await getLaunchableApplications();
  cachedLaunchableApplications = nextApps;
  return nextApps;
};
