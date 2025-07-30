// YearStatsTable.js
import React, { useMemo } from 'react';
import useCheckinData from '../hooks/useCheckinData';
import { computeYearStats } from '../utils/statsUtils';
import StatsTable from './StatsTable';

const YearStatsTable = ({ year }) => {
  const data = useCheckinData();
  const rows = useMemo(
    () => (data && year ? computeYearStats(data, year) : []),
    [data, year]
  );

  return <StatsTable rows={rows} />;
};

export default YearStatsTable;
