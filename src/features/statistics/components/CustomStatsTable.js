// CustomStatsTable.js
import React, { useMemo } from 'react';
import useCheckinData from '../hooks/useCheckinData';
import { computeCustomStats } from '../utils/statsUtils';
import StatsTable from './StatsTable';

const CustomStatsTable = ({ startDate, endDate }) => {
  const data = useCheckinData();
  const rows = useMemo(
    () =>
      data && startDate && endDate
        ? computeCustomStats(data, startDate, endDate)
        : [],
    [data, startDate, endDate]
  );

  return <StatsTable rows={rows} />;
};

export default CustomStatsTable;
