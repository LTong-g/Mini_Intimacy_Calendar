const MS_PER_MINUTE = 60 * 1000;

export const getUsageDurationMinutes = (durationMs) => (
  Math.round((Number(durationMs) || 0) / MS_PER_MINUTE)
);

export const formatUsageDurationChinese = (durationMs) => {
  const totalMinutes = getUsageDurationMinutes(durationMs);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}小时${minutes}分钟`;
  if (hours > 0) return `${hours}小时`;
  return `${minutes}分钟`;
};

export const formatUsageDurationCompact = (durationMs) => {
  const totalMinutes = getUsageDurationMinutes(durationMs);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

export const formatUsageAxisDurationCompact = (durationMs, maxMs) => {
  const minutes = (Number(durationMs) || 0) / MS_PER_MINUTE;
  if (maxMs < 4 * MS_PER_MINUTE) {
    return `${minutes.toFixed(1).replace(/\.0$/, '')}m`;
  }
  return formatUsageDurationCompact(durationMs);
};
