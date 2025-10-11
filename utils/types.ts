export interface loginPayload {
  username: string;
  password: string;
}

export interface user {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "user" | string;
  profileImage: string;
}

export interface loginResponseData {
  accessToken: string;
  refreshToken: string;
  user: user;
}

export interface loginResponse {
  success: boolean;
  data: loginResponseData;
  message: string;
}
