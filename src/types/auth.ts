export interface RegisterLoginRequest {
  PhoneNumber: string;
}

export interface VerifyOTPRequest {
  PhoneNumber: string;
  Otp: string;
}

export interface AuthResponse {
  token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  phoneNumber: string | null;
} 