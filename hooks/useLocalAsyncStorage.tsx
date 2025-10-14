import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
    async setItem(key: any, value: any) {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
        } catch (error) {
            console.error('Error saving data:', error);
        }
    },

    async getItem(key: any) {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (error) {
            console.error('Error reading data:', error);
            return null;
        }
    },

    async removeItem(key: any) {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing data:', error);
        }
    },

    async clear() {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    },
};
