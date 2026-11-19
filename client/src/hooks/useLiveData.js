import { useCallback, useEffect, useState } from 'react';
import api, { getApiError } from '../lib/api';

const useLiveData = (url, options = {}) => {
  const { initialData = null, enabled = true, transform } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled || !url) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(url);
      setData(transform ? transform(response.data) : response.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load live data'));
    } finally {
      setLoading(false);
    }
  }, [enabled, transform, url]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, setData, loading, error, refresh };
};

export default useLiveData;
