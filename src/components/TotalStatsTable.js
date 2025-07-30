// TotalStatsTable.js
import React, { useMemo } from 'react';
import useCheckinData from '../hooks/useCheckinData';
import { computeTotalStats } from '../utils/statsUtils';
import StatsTable from './StatsTable';

const TotalStatsTable = () => {
  const data = useCheckinData();
  const rows = useMemo(() => (data ? computeTotalStats(data) : []), [data]);

  return <StatsTable rows={rows} />;
};

export default TotalStatsTable;
