import { Storage } from "@/hooks/useLocalAsyncStorage";
import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.0.81:5000",
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await Storage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("Unauthorized - maybe redirect to login?");
    }
    return Promise.reject(error);
  }
);

export default api;
