// useCheckinData.js
import { useState, useEffect } from 'react';
import { getEffectiveCheckInData } from '../../calendar/utils/checkInStorage';

export default function useCheckinData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getEffectiveCheckInData()
      .then(checkInData => {
        if (!isMounted) return;
        setData(checkInData);
      })
      .catch(err => {
        console.error('获取签到数据失败', err);
        setData({});
      });
    return () => { isMounted = false; };
  }, []);

  return data;
}
