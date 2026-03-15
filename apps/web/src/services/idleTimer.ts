type TimeoutCallback = () => void;

interface IdleTimerConfig {
  timeout: number;
  events: string[];
  throttleDelay: number;
}

interface TimeoutStrategy {
  getTimeout(): number;
}

class MobileTimeoutStrategy implements TimeoutStrategy {
  private timeout: number;

  constructor(timeoutInMinutes: number = 15) {
    this.timeout = timeoutInMinutes * 60 * 1000;
  }

  getTimeout(): number {
    return this.timeout;
  }
}

class DesktopTimeoutStrategy implements TimeoutStrategy {
  private timeout: number;

  constructor(timeoutInMinutes: number = 30) {
    this.timeout = timeoutInMinutes * 60 * 1000;
  }

  getTimeout(): number {
    return this.timeout;
  }
}

export class IdleTimer {
  private static instances: Map<string, IdleTimer> = new Map();

  private timerId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private config: IdleTimerConfig;
  private callback: TimeoutCallback;
  private isPaused: boolean = false;
  private eventListeners: Array<{ event: string; handler: () => void }> = [];
  private timeoutStrategy: TimeoutStrategy;

  private constructor(callback: TimeoutCallback, config?: Partial<IdleTimerConfig>) {
    this.callback = callback;
    this.config = {
      timeout: 30 * 60 * 1000,
      events: [
        'mousedown',
        'keydown',
        'touchstart',
        'touchmove',
        'touchend',
        'scroll',
        'wheel',
        'click'
      ],
      throttleDelay: 1000,
      ...config
    };
    this.timeoutStrategy = new DesktopTimeoutStrategy();
  }

  static create(callback: TimeoutCallback, config?: Partial<IdleTimerConfig>, id?: string): IdleTimer {
    const instanceId = id || 'default';
    
    if (IdleTimer.instances.has(instanceId)) {
      const existingInstance = IdleTimer.instances.get(instanceId)!;
      existingInstance.reset(callback, config);
      return existingInstance;
    }

    const instance = new IdleTimer(callback, config);
    IdleTimer.instances.set(instanceId, instance);
    return instance;
  }

  static getInstance(id: string = 'default'): IdleTimer | undefined {
    return IdleTimer.instances.get(id);
  }

  static destroy(id: string = 'default'): void {
    const instance = IdleTimer.instances.get(id);
    if (instance) {
      instance.cleanup();
      IdleTimer.instances.delete(id);
    }
  }

  static destroyAll(): void {
    IdleTimer.instances.forEach((instance, id) => {
      instance.cleanup();
    });
    IdleTimer.instances.clear();
  }

  private reset(callback?: TimeoutCallback, config?: Partial<IdleTimerConfig>): void {
    this.stop();
    
    if (callback) {
      this.callback = callback;
    }
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.lastActivity = Date.now();
  }

  start(): void {
    if (this.isPaused) {
      return;
    }

    this.stop();
    this.attachEventListeners();
    this.scheduleTimeout();
  }

  stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.detachEventListeners();
  }

  pause(): void {
    this.isPaused = true;
    this.stop();
  }

  resume(): void {
    this.isPaused = false;
    this.start();
  }

  isRunning(): boolean {
    return this.timerId !== null;
  }

  getIdleTime(): number {
    return Date.now() - this.lastActivity;
  }

  getTimeRemaining(): number {
    return Math.max(0, this.getTimeout() - this.getIdleTime());
  }

  getTimeout(): number {
    return this.config.timeout;
  }

  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
    if (this.isRunning()) {
      this.stop();
      this.start();
    }
  }

  useMobileTimeout(timeoutInMinutes: number = 15): void {
    this.timeoutStrategy = new MobileTimeoutStrategy(timeoutInMinutes);
    this.config.timeout = this.timeoutStrategy.getTimeout();
    if (this.isRunning()) {
      this.stop();
      this.start();
    }
  }

  useDesktopTimeout(timeoutInMinutes: number = 30): void {
    this.timeoutStrategy = new DesktopTimeoutStrategy(timeoutInMinutes);
    this.config.timeout = this.timeoutStrategy.getTimeout();
    if (this.isRunning()) {
      this.stop();
      this.start();
    }
  }

  resetActivity(): void {
    this.lastActivity = Date.now();
    if (this.isRunning()) {
      this.stop();
      this.start();
    }
  }

  private scheduleTimeout(): void {
    const timeoutDelay = this.config.timeout;
    
    this.timerId = setTimeout(() => {
      const idleTime = this.getIdleTime();
      
      if (idleTime >= this.config.timeout) {
        this.stop();
        this.callback();
      } else {
        this.scheduleTimeout();
      }
    }, timeoutDelay);
  }

  private attachEventListeners(): void {
    const throttledHandler = this.throttle(() => {
      this.resetActivity();
    }, this.config.throttleDelay);

    this.config.events.forEach(event => {
      const handler = throttledHandler;
      window.addEventListener(event, handler);
      this.eventListeners.push({ event, handler });
    });
  }

  private detachEventListeners(): void {
    this.eventListeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  private throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecuted = 0;

    return ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecuted = now - lastExecuted;

      if (timeSinceLastExecuted >= delay) {
        lastExecuted = now;
        func(...args);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          lastExecuted = Date.now();
          func(...args);
        }, delay - timeSinceLastExecuted);
      }
    }) as T;
  }

  cleanup(): void {
    this.stop();
    this.eventListeners = [];
  }
}

export default IdleTimer;
