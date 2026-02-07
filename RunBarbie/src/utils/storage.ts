import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const DISTANCE_UNITS_KEY = 'distance_units';

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

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },

  async getDistanceUnits(): Promise<'km' | 'miles'> {
    const v = await AsyncStorage.getItem(DISTANCE_UNITS_KEY);
    return (v === 'miles' ? 'miles' : 'km') as 'km' | 'miles';
  },

  async setDistanceUnits(units: 'km' | 'miles'): Promise<void> {
    await AsyncStorage.setItem(DISTANCE_UNITS_KEY, units);
  },
};
