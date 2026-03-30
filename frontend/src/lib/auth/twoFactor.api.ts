import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const setup2FAAPI = async () => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/setup`, {}, { headers: authHeaders() });
  return data as { success: boolean; qrCodeDataUrl: string; manualCode: string };
};

/** Used during forced first-time setup at login — no full auth token needed */
export const setupWithTokenAPI = async (tempToken: string) => {
  const { data } = await axios.post(`${BASE_URL}/auth/2fa/setup-with-token`, { tempToken });
  return data as { success: boolean; qrCodeDataUrl: string; manualCode: string };
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
