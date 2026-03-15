import { create } from 'zustand';

interface RateLimitState {
  isRateLimited: boolean;
  retryUntil: number | null;
  errorMessage: string;
}

interface RateLimitActions {
  setRateLimit: (errorMessage: string, retryAfterSeconds: number) => void;
  clearRateLimit: () => void;
  getRemainingTime: () => number;
}

interface RateLimitStore extends RateLimitState, RateLimitActions {}

export const useRateLimitStore = create<RateLimitStore>((set, get) => ({
  isRateLimited: false,
  retryUntil: null,
  errorMessage: '',

  setRateLimit: (errorMessage: string, retryAfterSeconds: number) => {
    const retryUntil = Date.now() + retryAfterSeconds * 1000;
    set({ isRateLimited: true, retryUntil, errorMessage });

    setTimeout(() => {
      get().clearRateLimit();
    }, retryAfterSeconds * 1000);
  },

  clearRateLimit: () => {
    set({ isRateLimited: false, retryUntil: null, errorMessage: '' });
  },

  getRemainingTime: () => {
    const { retryUntil } = get();
    if (!retryUntil) return 0;
    const remaining = Math.ceil((retryUntil - Date.now()) / 1000);
    return Math.max(0, remaining);
  },
}));

export const useRateLimitState = () => {
  const isRateLimited = useRateLimitStore((state) => state.isRateLimited);
  const errorMessage = useRateLimitStore((state) => state.errorMessage);
  const getRemainingTime = useRateLimitStore((state) => state.getRemainingTime);

  return {
    isRateLimited,
    errorMessage,
    remainingTime: getRemainingTime(),
  };
};

export const useRateLimitActions = () => {
  const setRateLimit = useRateLimitStore((state) => state.setRateLimit);
  const clearRateLimit = useRateLimitStore((state) => state.clearRateLimit);

  return {
    setRateLimit,
    clearRateLimit,
  };
};
