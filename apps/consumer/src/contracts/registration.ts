// Registration / pre-auth contract types.
//
// Mirrors the shapes defined in `micboxx-web/src/lib/drupal-registration.ts`.
// All endpoints live under `/v1/auth/*` on Drupal, are unauthenticated, and
// return responses wrapped in the standard `{ data: ... }` envelope.

export type SignupIntent = "listener" | "artist";

export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  signupIntent: SignupIntent;
  termsAccepted: boolean;
}

export interface RegisterResult {
  uid: number;
  email: string;
  signupIntent: string;
  message: string;
}

export interface VerifyRequest {
  uid: number;
  code: string;
}

export interface VerifyResult {
  verified: boolean;
  uid: number;
  username: string;
  email: string;
  signupIntent: string;
}

export interface ResendCodeRequest {
  uid: number;
}

export interface ResendCodeResult {
  sent: boolean;
  message: string;
}

export interface AvailabilityResult {
  available: boolean;
  reason: string | null;
}
