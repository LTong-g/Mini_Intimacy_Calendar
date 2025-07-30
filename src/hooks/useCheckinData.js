// useCheckinData.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHECKIN_KEY = 'checkin_status';

export default function useCheckinData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(CHECKIN_KEY)
      .then(json => {
        if (!isMounted) return;
        if (json) {
          try {
            setData(JSON.parse(json));
          } catch (e) {
            console.error('解析签到数据失败', e);
            setData({});
          }
        } else {
          setData({});
        }
      })
      .catch(err => {
        console.error('获取签到数据失败', err);
        setData({});
      });
    return () => { isMounted = false; };
  }, []);

  return data;
}
