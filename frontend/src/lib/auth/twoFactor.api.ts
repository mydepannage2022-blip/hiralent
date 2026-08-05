import axios from "axios";
import { API_V1_BASE } from "@/src/lib/config/api";

const BASE_URL = API_V1_BASE;

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const setup2FAAPI = async () => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/setup`, {}, { headers: authHeaders() });
  // Response envelope (R-36): the QR payload lives under `data`, not at the top level.
  const payload = data?.data ?? data;
  return payload as { qrCodeDataUrl: string; manualCode: string };
};

/** Used during forced first-time setup at login — no full auth token needed */
export const setupWithTokenAPI = async (tempToken: string) => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/setup-with-token`, { tempToken });
  // Response envelope (R-36): unwrap `data`. Login page's `?? qrRes` fallback stays safe.
  const payload = data?.data ?? data;
  return payload as { qrCodeDataUrl: string; manualCode: string };
};

export const enable2FAAPI = async (token: string) => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/enable`, { token }, { headers: authHeaders() });
  return data as { success: boolean; message: string };
};

export const disable2FAAPI = async (token: string) => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/disable`, { token }, { headers: authHeaders() });
  return data as { success: boolean; message: string };
};

export const verifyLogin2FAAPI = async (tempToken: string, mfaToken: string) => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/verify-login`, { tempToken, mfaToken });
  return data;
};

export const verifyRecoveryCodeAPI = async (tempToken: string, recoveryCode: string) => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/verify-recovery`, { tempToken, recoveryCode });
  return data;
};
