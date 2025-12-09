"use client";
import { useEffect } from "react";

export default function DevTokenSetter() {
  useEffect(() => {
    try {
      const token = (process.env.NEXT_PUBLIC_DEV_TOKEN as string) || '';
      if (!token) return;

      const key = (process.env.NEXT_PUBLIC_DEV_TOKEN_KEY as string) || 'authToken';
      const store = (process.env.NEXT_PUBLIC_DEV_TOKEN_STORE as string) || 'localStorage';

      if (store === 'cookie') {
        const existing = document.cookie.split('; ').find((c) => c.startsWith(`${key}=`));
        if (!existing || !existing.includes(token)) {
          // set cookie for 30 days
          const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = `${key}=${token}; path=/; expires=${expires}`;
          // reload once to ensure app picks up token
          window.location.reload();
        }
      } else {
        const existing = localStorage.getItem(key);
        if (existing !== token) {
          localStorage.setItem(key, token);
          window.location.reload();
        }
      }
    } catch (e) {
      // swallow in dev helper
      // eslint-disable-next-line no-console
      console.error('DevTokenSetter error', e);
    }
  }, []);

  return null;
}
