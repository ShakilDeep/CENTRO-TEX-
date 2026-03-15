type DeviceType = 'mobile' | 'tablet' | 'desktop';

export class MobileDetection {
  private static instance: MobileDetection;
  private cachedDeviceType: DeviceType | null = null;

  private constructor() {}

  static getInstance(): MobileDetection {
    if (!MobileDetection.instance) {
      MobileDetection.instance = new MobileDetection();
    }
    return MobileDetection.instance;
  }

  isMobile(): boolean {
    return this.getDeviceType() === 'mobile';
  }

  isTablet(): boolean {
    return this.getDeviceType() === 'tablet';
  }

  isDesktop(): boolean {
    return this.getDeviceType() === 'desktop';
  }

  getDeviceType(): DeviceType {
    if (this.cachedDeviceType !== null) {
      return this.cachedDeviceType;
    }

    this.cachedDeviceType = this.detectDevice();
    return this.cachedDeviceType;
  }

  private detectDevice(): DeviceType {
    if (typeof window === 'undefined') {
      return 'desktop';
    }

    const userAgent = navigator.userAgent;

    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;
    const tabletRegex = /(iPad|Android(?=.*\bMobile\b)|PlayBook|Silk|Kindle|Nexus|Nokia|Samsung|Xoom)/i;

    const isMobileDevice = mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);
    const isTabletDevice = tabletRegex.test(userAgent) || (this.isTouchDevice() && window.innerWidth >= 768);

    if (isTabletDevice) {
      return 'tablet';
    }

    if (isMobileDevice || (this.isTouchDevice() && window.innerWidth < 768)) {
      return 'mobile';
    }

    return 'desktop';
  }

  private isTouchDevice(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }

  getScreenSize(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  clearCache(): void {
    this.cachedDeviceType = null;
  }
}

export default MobileDetection;
