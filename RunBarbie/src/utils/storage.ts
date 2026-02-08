import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const FACEBOOK_TOKEN_KEY = 'facebook_access_token';
const DISTANCE_UNITS_KEY = 'distance_units';
const REMEMBER_EMAIL_KEY = 'remember_email';
const REMEMBER_ME_KEY = 'remember_me';
const NOTIFICATIONS_SETTINGS_KEY = 'notifications_settings';
const SAFETY_SETTINGS_KEY = 'safety_settings';
const CONNECTED_APPS_KEY = 'connected_apps';
const RECENT_SEARCHES_KEY = 'recent_searches';

export type NotificationsSettings = {
  likes: boolean;
  comments: boolean;
  weeklySummary: boolean;
  challenges: boolean;
};

export type SafetySettings = {
  shareLiveLocation: boolean;
  emergencyContact: string;
};

export type ConnectedAppsSettings = {
  strava: boolean;
  garmin: boolean;
  appleHealth: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationsSettings = {
  likes: true,
  comments: true,
  weeklySummary: true,
  challenges: false,
};

const DEFAULT_SAFETY: SafetySettings = {
  shareLiveLocation: false,
  emergencyContact: '',
};

const DEFAULT_CONNECTED_APPS: ConnectedAppsSettings = {
  strava: false,
  garmin: false,
  appleHealth: false,
};

export const storage = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  async setFacebookToken(token: string | null): Promise<void> {
    if (token == null) await AsyncStorage.removeItem(FACEBOOK_TOKEN_KEY);
    else await AsyncStorage.setItem(FACEBOOK_TOKEN_KEY, token);
  },

  async getFacebookToken(): Promise<string | null> {
    return await AsyncStorage.getItem(FACEBOOK_TOKEN_KEY);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, FACEBOOK_TOKEN_KEY]);
  },

  async getDistanceUnits(): Promise<'km' | 'miles'> {
    const v = await AsyncStorage.getItem(DISTANCE_UNITS_KEY);
    return (v === 'miles' ? 'miles' : 'km') as 'km' | 'miles';
  },

  async setDistanceUnits(units: 'km' | 'miles'): Promise<void> {
    await AsyncStorage.setItem(DISTANCE_UNITS_KEY, units);
  },

  async getRememberEmail(): Promise<string | null> {
    return await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
  },

  async setRememberEmail(email: string): Promise<void> {
    await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email);
  },

  async getRememberMe(): Promise<boolean> {
    const v = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    return v === 'true';
  },

  async setRememberMe(value: boolean): Promise<void> {
    await AsyncStorage.setItem(REMEMBER_ME_KEY, value ? 'true' : 'false');
  },

  async getNotificationsSettings(): Promise<NotificationsSettings> {
    const v = await AsyncStorage.getItem(NOTIFICATIONS_SETTINGS_KEY);
    if (!v) return DEFAULT_NOTIFICATIONS;
    try {
      return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(v) };
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  },

  async setNotificationsSettings(s: NotificationsSettings): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATIONS_SETTINGS_KEY, JSON.stringify(s));
  },

  async getSafetySettings(): Promise<SafetySettings> {
    const v = await AsyncStorage.getItem(SAFETY_SETTINGS_KEY);
    if (!v) return { ...DEFAULT_SAFETY };
    try {
      return { ...DEFAULT_SAFETY, ...JSON.parse(v) };
    } catch {
      return { ...DEFAULT_SAFETY };
    }
  },

  async setSafetySettings(s: SafetySettings): Promise<void> {
    await AsyncStorage.setItem(SAFETY_SETTINGS_KEY, JSON.stringify(s));
  },

  async getConnectedApps(): Promise<ConnectedAppsSettings> {
    const v = await AsyncStorage.getItem(CONNECTED_APPS_KEY);
    if (!v) return { ...DEFAULT_CONNECTED_APPS };
    try {
      return { ...DEFAULT_CONNECTED_APPS, ...JSON.parse(v) };
    } catch {
      return { ...DEFAULT_CONNECTED_APPS };
    }
  },

  async setConnectedApps(s: ConnectedAppsSettings): Promise<void> {
    await AsyncStorage.setItem(CONNECTED_APPS_KEY, JSON.stringify(s));
  },

  async getRecentSearches(): Promise<string[]> {
    const v = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!v) return [];
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  },

  async setRecentSearches(searches: string[]): Promise<void> {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, 20)));
  },
};
