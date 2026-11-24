import { useCallback, useEffect, useState } from 'react';
import api, { getApiError } from '../lib/api';

const useLiveData = (url, options = {}) => {
  const { initialData = null, enabled = true, transform, interval = 12000 } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const refresh = useCallback(async (isBackground = false) => {
    if (!enabled || !url) return;
    if (!isBackground) setLoading(true);
    setError('');
    try {
      const response = await api.get(url);
      setData(transform ? transform(response.data) : response.data);
    } catch (requestError) {
      if (!isBackground) setError(getApiError(requestError, 'Unable to load live data'));
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [enabled, transform, url]);

  useEffect(() => {
    refresh(false);
    if (interval && interval > 0) {
      const timer = window.setInterval(() => refresh(true), interval);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [refresh, interval]);

  return { data, setData, loading, error, refresh };
};

export default useLiveData;
