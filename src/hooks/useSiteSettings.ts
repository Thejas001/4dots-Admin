import { useState, useEffect } from 'react';
import { SiteSettings, Banner } from '@/types/site';

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    codEnabled: true,
    maintenanceMode: false,
    contactEmail: '',
    contactPhone: '',
    banners: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Load COD status first
      await loadCodStatus();
      
      const response = await fetch('/api/site-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      
      const data = await response.json();
      setSettings(prev => ({
        ...prev,
        ...data,
        // Keep COD status from the API call
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      
      // Fallback to mock data if API fails
      const mockSettings: SiteSettings = {
        codEnabled: true,
        maintenanceMode: false,
        contactEmail: 'admin@4dots.com',
        contactPhone: '+91 9876543210',
        banners: [
          {
            id: '1',
            imageUrl: 'https://via.placeholder.com/1200x400/4F46E5/FFFFFF?text=Welcome+to+4dots',
            altText: 'Welcome to 4dots - Premium Printing Services',
            clickUrl: '/products',
            isActive: true,
            displayOrder: 1,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      setSettings(mockSettings);
    } finally {
      setLoading(false);
    }
  };

  const loadCodStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('https://fourdotsapp.azurewebsites.net/api/cod/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          codEnabled: data.CodEnabled || false,
        }));
      }
    } catch (err) {
      // Silently fail - will use fallback value
      console.warn('Failed to load COD status:', err);
    }
  };

  const saveSettings = async (newSettings: SiteSettings) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/site-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      const result = await response.json();
      setSettings(result.settings || newSettings);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof SiteSettings, value: boolean | number | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleCod = async (enabled: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('https://fourdotsapp.azurewebsites.net/api/cod/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          CodEnabled: enabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to toggle COD');
      }

      // Update local state
      setSettings(prev => ({
        ...prev,
        codEnabled: enabled,
      }));

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle COD';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const addBanner = (banner: Omit<Banner, 'id' | 'createdAt'>) => {
    const newBanner: Banner = {
      ...banner,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    setSettings(prev => ({
      ...prev,
      banners: [...prev.banners, newBanner],
    }));
  };

  const updateBanner = (id: string, updates: Partial<Banner>) => {
    setSettings(prev => ({
      ...prev,
      banners: prev.banners.map(banner => 
        banner.id === id ? { ...banner, ...updates } : banner
      ),
    }));
  };

  const deleteBanner = (id: string) => {
    setSettings(prev => ({
      ...prev,
      banners: prev.banners.filter(banner => banner.id !== id),
    }));
  };

  const reorderBanners = (banners: Banner[]) => {
    setSettings(prev => ({
      ...prev,
      banners: banners.map((banner, index) => ({
        ...banner,
        displayOrder: index + 1,
      })),
    }));
  };

  useEffect(() => {
    loadSettings();
    // Also load COD status separately to ensure it's always updated
    loadCodStatus();
  }, []);

  return {
    settings,
    loading,
    error,
    loadSettings,
    saveSettings,
    updateSetting,
    toggleCod,
    addBanner,
    updateBanner,
    deleteBanner,
    reorderBanners,
  };
};
