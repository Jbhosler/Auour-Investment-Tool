import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

/**
 * Hook to sync state with backend API instead of localStorage
 * Provides same interface as usePersistentState but uses database
 */
export function useApiState(dataType, defaultValue) {
  const [state, setState] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data from API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let data;
        
        switch (dataType) {
          case 'strategies':
            data = await apiService.getStrategies();
            break;
          case 'benchmarks':
            data = await apiService.getBenchmarks();
            break;
          case 'settings':
            data = await apiService.getSettings();
            setState(data);
            setLoading(false);
            return; // Settings handled differently
          default:
            data = defaultValue;
        }
        
        setState(data || defaultValue);
        setError(null);
      } catch (err) {
        console.error(`Error loading ${dataType}:`, err);
        setError(err.message);
        setState(defaultValue); // Fallback to default on error
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dataType]);

  return [state, setState, { loading, error }];
}

/**
 * Hook specifically for firm settings (logo, pages)
 */
export function useSettingsState() {
  const [settings, setSettings] = useState({
    logo_data: null,
    before_output_pages: [],
    after_output_pages: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiService.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const updated = await apiService.updateSettings(newSettings);
      setSettings(updated);
      return updated;
    } catch (err) {
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  return [settings, updateSettings, { loading }];
}

export default useApiState;
