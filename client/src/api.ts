import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

// In-memory access token & userId
let accessToken: string | null = null;
let userId: number | null = null;

// To handle concurrent 401s gracefully
let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

/**
 * Set current auth state (used after login/refresh/logout).
 */
export function setAuthState(
  newAccessToken: string | null,
  newUserId: number | null,
) {
  accessToken = newAccessToken;
  userId = newUserId;
}

/**
 * Optionally exposed if you ever need the current userId.
 */
export function getCurrentUserId(): number | null {
  return userId;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach Authorization header if we have an access token
api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle 401 responses by attempting a token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s once per request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          pendingRequests.push((newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const storedRefresh = localStorage.getItem("refreshToken");
        const storedUserId = localStorage.getItem("userId");

        if (!storedRefresh || !storedUserId) {
          throw new Error("No refresh token or userId found");
        }

        const uid = parseInt(storedUserId, 10);
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          userId: uid,
          refreshToken: storedRefresh,
        });

        const {
          accessToken: newAccess,
          refreshToken: newRefresh,
          user,
        } = res.data;

        setAuthState(newAccess, user.id);
        localStorage.setItem("refreshToken", newRefresh);
        localStorage.setItem("userId", String(user.id));

        // Resolve all queued requests
        pendingRequests.forEach((cb) => cb(newAccess));
        pendingRequests = [];
        isRefreshing = false;

        // Retry original
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed; clear auth state and fail queued requests
        pendingRequests.forEach((cb) => cb(null));
        pendingRequests = [];
        isRefreshing = false;

        setAuthState(null, null);
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");

        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);
