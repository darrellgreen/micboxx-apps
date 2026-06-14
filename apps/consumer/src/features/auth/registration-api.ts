import type {
  AvailabilityResult,
  RegisterRequest,
  RegisterResult,
  ResendCodeResult,
  VerifyResult,
} from "@micboxx/contracts";
import { apiFetch } from "@micboxx/api";

export async function registerUserForVerification(
  payload: RegisterRequest,
): Promise<RegisterResult> {
  return apiFetch<RegisterResult>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyRegistrationCode(
  uid: number,
  code: string,
): Promise<VerifyResult> {
  return apiFetch<VerifyResult>("/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ uid, code }),
  });
}

export async function resendRegistrationCode(
  uid: number,
): Promise<ResendCodeResult> {
  return apiFetch<ResendCodeResult>("/v1/auth/resend-code", {
    method: "POST",
    body: JSON.stringify({ uid }),
  });
}

export async function checkUsernameAvailability(
  username: string,
): Promise<AvailabilityResult> {
  return apiFetch<AvailabilityResult>("/v1/auth/check-username", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function checkEmailAvailability(
  email: string,
): Promise<AvailabilityResult> {
  return apiFetch<AvailabilityResult>("/v1/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
