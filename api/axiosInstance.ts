import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.151.31:5000",
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    // const currentUserDetails = await Storage.get("user-data");

    // const token = currentUserDetails?.accessToken;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    // return config;
    console.log("calling API")
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Unauthorized - maybe redirect to login?");
    }
    return Promise.reject(error);
  }
);

export default api;
