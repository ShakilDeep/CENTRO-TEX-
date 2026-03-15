import { useAuthStore } from '../stores/authStore';
import type { RefreshTokenResponse } from '../api/auth';

interface QueuedRequest {
  resolve: (result: RefreshTokenResponse | null) => void;
  reject: (error: unknown) => void;
}

interface RefreshConfig {
  refreshThreshold: number;
  maxRetries: number;
  retryDelay: number;
}

export class TokenRefreshService {
  private static instance: TokenRefreshService;
  private isRefreshing = false;
  private queuedRequests: QueuedRequest[] = [];
  private refreshPromise: Promise<RefreshTokenResponse | null> | null = null;
  private proactiveRefreshTimer: NodeJS.Timeout | null = null;
  private config: RefreshConfig;

  private constructor() {
    this.config = {
      refreshThreshold: 5 * 60 * 1000,
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  static getInstance(): TokenRefreshService {
    if (!TokenRefreshService.instance) {
      TokenRefreshService.instance = new TokenRefreshService();
    }
    return TokenRefreshService.instance;
  }

  async refreshToken(): Promise<RefreshTokenResponse | null> {
    if (this.isRefreshing) {
      return this.waitForRefresh();
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const result = await this.refreshPromise;
      this.processQueuedRequests(result);
      return result;
    } catch (error) {
      this.processQueuedRequests(null);
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(retryCount = 0): Promise<RefreshTokenResponse | null> {
    const { refreshToken, isRefreshTokenExpired } = useAuthStore.getState();

    if (!refreshToken || isRefreshTokenExpired()) {
      await this.forceLogout();
      return null;
    }

    try {
      const result = await useAuthStore.getState().refreshAccessToken();

      if (result) {
        this.scheduleProactiveRefresh(result.expiresIn);
        return result;
      }

      return null;
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (retryCount + 1)));
        return this.performRefresh(retryCount + 1);
      }

      await this.forceLogout();
      throw error;
    }
  }

  private waitForRefresh(): Promise<RefreshTokenResponse | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    return new Promise((resolve, reject) => {
      this.queuedRequests.push({ resolve, reject });
    });
  }

  private processQueuedRequests(result: RefreshTokenResponse | null): void {
    this.queuedRequests.forEach(({ resolve, reject }) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Token refresh failed'));
      }
    });

    this.queuedRequests = [];
  }

  private async forceLogout(): Promise<void> {
    await useAuthStore.getState().logout(true);
  }

  scheduleProactiveRefresh(expiresInSeconds: number): void {
    this.clearProactiveRefreshTimer();

    const refreshDelay = Math.max(
      (expiresInSeconds * 1000) - this.config.refreshThreshold,
      60000
    );

    this.proactiveRefreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Proactive token refresh failed:', error);
      }
    }, refreshDelay);
  }

  clearProactiveRefreshTimer(): void {
    if (this.proactiveRefreshTimer) {
      clearTimeout(this.proactiveRefreshTimer);
      this.proactiveRefreshTimer = null;
    }
  }

  shouldRefreshProactively(): boolean {
    const { getTimeUntilExpiry, isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      return false;
    }

    const timeUntilExpiry = getTimeUntilExpiry();
    return timeUntilExpiry > 0 && timeUntilExpiry <= this.config.refreshThreshold;
  }

  async ensureValidToken(): Promise<string | null> {
    const { accessToken, isTokenExpired, isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      return null;
    }

    if (!accessToken || isTokenExpired()) {
      const result = await this.refreshToken();
      return result?.accessToken || null;
    }

    if (this.shouldRefreshProactively()) {
      this.refreshToken().catch(error => {
        console.error('Proactive refresh failed:', error);
      });
    }

    return accessToken;
  }

  cancelPendingRefreshes(): void {
    this.queuedRequests.forEach(({ reject }) => {
      reject(new Error('Refresh cancelled'));
    });
    this.queuedRequests = [];
  }

  configure(config: Partial<RefreshConfig>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {
    this.clearProactiveRefreshTimer();
    this.cancelPendingRefreshes();
  }
}

export default TokenRefreshService;
