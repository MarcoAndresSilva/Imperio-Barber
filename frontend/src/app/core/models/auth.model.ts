export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}
