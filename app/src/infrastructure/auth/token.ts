const TOKEN_KEY = "sae_studio_token";
const REFRESH_KEY = "sae_studio_refresh";
const API_URL_KEY = "sae_studio_api_url";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function saveTokens(token: string, refreshToken?: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  } catch {
    // localStorage unavailable
  }
}

export function removeTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function getApiBaseUrl(): string {
  try {
    return localStorage.getItem(API_URL_KEY) ?? import.meta.env.PUBLIC_SAELABEL_API_BASE_URL ?? "http://localhost:5117";
  } catch {
    return "http://localhost:5117";
  }
}

export function setApiBaseUrl(url: string): void {
  try {
    localStorage.setItem(API_URL_KEY, url);
  } catch {
    // localStorage unavailable
  }
}
