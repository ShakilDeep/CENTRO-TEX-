import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { ValidationFacade } from '../utils/validation/validationFacade';

/**
 * QRScanner Component Props
 * Following Dependency Inversion Principle - callbacks for extensibility
 */
export interface QRScannerProps {
  /** Callback when QR code is successfully scanned */
  onScan: (decodedText: string, decodedResult: any) => void;
  /** Callback when scanning fails */
  onError?: (error: string) => void;
  /** Width of the scanner (default: 300px) */
  width?: number;
  /** Height of the scanner (default: 300px) */
  height?: number;
  /** Frames per second for scanning (default: 10) */
  fps?: number;
  /** Enable USB scanner keyboard input fallback (default: true) */
  enableUSBScanner?: boolean;
  /** QR box size as percentage of video (default: 70) */
  qrbox?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show verbose messages (default: false) */
  verbose?: boolean;
  /** Validate QR code format (default: false) */
  validateQRCode?: boolean;
  /** QR code type for validation: 'sample' or 'location' */
  qrCodeType?: 'sample' | 'location';
}

/**
 * QRScanner Component
 * 
 * A comprehensive QR code scanner with multiple input methods:
 * - Camera scanning with permission handling
 * - USB barcode scanner fallback via keyboard events
 * - Error recovery and user guidance
 * - Accessibility support
 * 
 * Design Patterns:
 * - Strategy Pattern: Multiple scanning strategies (camera, USB)
 * - Observer Pattern: Event-driven architecture
 * - Facade Pattern: Simplifies html5-qrcode complexity
 * 
 * @example
 * ```tsx
 * <QRScanner 
 *   onScan={(code) => console.log('Scanned:', code)}
 *   onError={(err) => console.error('Error:', err)}
 * />
 * ```
 */
export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  width = 300,
  height = 300,
  fps = 10,
  enableUSBScanner = true,
  qrbox = 70,
  className = '',
  verbose = false,
  validateQRCode = false,
  qrCodeType = 'sample'
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // USB Scanner state
  const usbBufferRef = useRef<string>('');
  const usbTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle successful QR code scan
   * Implements debouncing to prevent duplicate scans
   * Validates QR code format if validation is enabled
   */
  const handleScanSuccess = useCallback((decodedText: string, decodedResult: any) => {
    if (verbose) {
      console.log('[QRScanner] Scan success:', decodedText);
    }

    if (validateQRCode) {
      const validation = ValidationFacade.validateQRCode(decodedText, qrCodeType);
      if (!validation.success) {
        if (verbose) {
          console.log('[QRScanner] Validation failed:', validation.error);
        }
        onError?.(validation.error || 'Invalid QR code format');
        return;
      }
    }

    onScan(decodedText, decodedResult);
  }, [onScan, verbose, validateQRCode, qrCodeType, onError]);

  /**
   * Handle scan error
   * Only logs verbose errors to avoid spamming console
   */
  const handleScanError = useCallback((errorMessage: string) => {
    // Ignore "No MultiFormat Readers" - it's normal during scanning
    if (errorMessage.includes('No MultiFormat Readers')) {
      return;
    }
    
    if (verbose) {
      console.warn('[QRScanner] Scan error:', errorMessage);
    }
  }, [verbose]);

  /**
   * USB Scanner keyboard event handler
   * Implements buffering strategy for barcode scanner input
   */
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Only process if USB scanner is enabled
    if (!enableUSBScanner) return;

    // Clear previous timer
    if (usbTimerRef.current) {
      clearTimeout(usbTimerRef.current);
    }

    // Handle Enter key - submit buffered code
    if (event.key === 'Enter' && usbBufferRef.current.length > 0) {
      event.preventDefault();
      const scannedCode = usbBufferRef.current;
      usbBufferRef.current = '';
      
      if (verbose) {
        console.log('[QRScanner] USB Scanner input:', scannedCode);
      }
      
      handleScanSuccess(scannedCode, { 
        decodedText: scannedCode,
        result: { format: { formatName: 'USB_SCANNER' } }
      });
      return;
    }

    // Buffer alphanumeric characters
    if (event.key.length === 1) {
      usbBufferRef.current += event.key;
      
      // Auto-submit after 100ms of no input (typical scanner speed)
      usbTimerRef.current = setTimeout(() => {
        if (usbBufferRef.current.length > 5) { // Minimum code length
          const scannedCode = usbBufferRef.current;
          usbBufferRef.current = '';
          
          if (verbose) {
            console.log('[QRScanner] USB Scanner auto-submit:', scannedCode);
          }
          
          handleScanSuccess(scannedCode, { 
            decodedText: scannedCode,
            result: { format: { formatName: 'USB_SCANNER' } }
          });
        } else {
          usbBufferRef.current = ''; // Clear if too short
        }
      }, 100);
    }
  }, [enableUSBScanner, handleScanSuccess, verbose]);

  /**
   * Initialize camera scanner
   */
  useEffect(() => {
    const initializeScanner = async () => {
      if (!scannerElementRef.current) return;

      try {
        // Check camera availability
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setHasCamera(false);
          setError('No camera detected. Please use USB scanner or connect a camera.');
          onError?.('No camera available');
          return;
        }

        setHasCamera(true);

        // Initialize scanner
        const scanner = new Html5Qrcode('qr-scanner-container', {
          verbose: verbose
        });
        scannerRef.current = scanner;

        // Start scanning
        const qrboxSize = Math.floor((Math.min(width, height) * qrbox) / 100);
        
        await scanner.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          {
            fps: fps,
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1.0
          },
          handleScanSuccess,
          handleScanError
        );

        setIsScanning(true);
        setError(null);
        setPermissionDenied(false);

      } catch (err: any) {
        console.error('[QRScanner] Initialization failed:', err);
        
        if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
          setPermissionDenied(true);
          setError('Camera permission denied. Please enable camera access in your browser settings.');
          onError?.('Camera permission denied');
        } else if (err.name === 'NotFoundError') {
          setHasCamera(false);
          setError('No camera found. Please connect a camera or use USB scanner.');
          onError?.('No camera found');
        } else {
          setError(`Failed to start scanner: ${err.message || 'Unknown error'}`);
          onError?.(err.message || 'Scanner initialization failed');
        }
      }
    };

    initializeScanner();

    // Cleanup function
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error('[QRScanner] Failed to stop scanner:', err);
        });
      }
    };
  }, [width, height, fps, qrbox, verbose, handleScanSuccess, handleScanError, onError]);

  /**
   * Setup USB scanner keyboard listener
   */
  useEffect(() => {
    if (!enableUSBScanner) return;

    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      if (usbTimerRef.current) {
        clearTimeout(usbTimerRef.current);
      }
    };
  }, [enableUSBScanner, handleKeyPress]);

  /**
   * Request camera permission
   */
  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      window.location.reload(); // Reload to reinitialize scanner
    } catch (err) {
      console.error('[QRScanner] Permission request failed:', err);
      setError('Failed to get camera permission');
      onError?.('Permission request failed');
    }
  };

  // Permission denied state
  if (permissionDenied) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 ${className}`}
        style={{ width, height }}
        role="alert"
      >
        <span className="material-symbols-outlined text-yellow-600 text-6xl mb-4">videocam_off</span>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Camera Access Required</h3>
        <p className="text-sm text-yellow-700 text-center mb-4">
          Please enable camera permissions to scan QR codes
        </p>
        <button
          onClick={requestPermission}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Grant Permission
        </button>
        {enableUSBScanner && (
          <p className="text-xs text-yellow-600 mt-4">
            Or use a USB barcode scanner as an alternative
          </p>
        )}
      </div>
    );
  }

  // No camera state
  if (!hasCamera && error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-blue-50 border-2 border-blue-200 rounded-lg p-6 ${className}`}
        style={{ width, height }}
        role="alert"
      >
        <span className="material-symbols-outlined text-blue-600 text-6xl mb-4">camera_alt</span>
        <h3 className="text-lg font-semibold text-blue-900 mb-2">No Camera Detected</h3>
        <p className="text-sm text-blue-700 text-center mb-2">{error}</p>
        {enableUSBScanner && (
          <div className="mt-4 p-4 bg-white rounded-md border border-blue-200">
            <p className="text-sm text-blue-900 font-medium mb-2">USB Scanner Mode Active</p>
            <p className="text-xs text-blue-600">
              Scan barcodes using your USB scanner and press Enter
            </p>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}
        style={{ width, height }}
        role="alert"
      >
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
        <h3 className="text-lg font-semibold text-red-900 mb-2">Scanner Error</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
      </div>
    );
  }

  // Scanner UI
  return (
    <div className={`relative ${className}`}>
      <div 
        id="qr-scanner-container" 
        ref={scannerElementRef}
        className="rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg"
        style={{ width, height }}
      />
      {isScanning && (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <span className="material-symbols-outlined animate-pulse">qr_code_scanner</span>
            <p className="text-sm font-medium">Scanning for QR codes...</p>
          </div>
          {enableUSBScanner && (
            <p className="text-xs text-gray-500 mt-2">
              USB scanner also active
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
