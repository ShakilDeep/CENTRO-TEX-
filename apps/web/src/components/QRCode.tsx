import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

/**
 * QRCode Component Props
 * Following Interface Segregation Principle - only required props
 */
export interface QRCodeProps {
  /** The URL or text to encode in the QR code */
  value: string;
  /** Size of the QR code in pixels (default: 200) */
  size?: number;
  /** Error correction level (default: 'M') */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Foreground color (default: '#000000') */
  fgColor?: string;
  /** Background color (default: '#FFFFFF') */
  bgColor?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when QR code generation fails */
  onError?: (error: Error) => void;
}

/**
 * QRCode Generator Component
 * 
 * A reusable, performant QR code generator following React best practices:
 * - Single Responsibility: Only handles QR code generation and display
 * - Error Handling: Gracefully handles generation failures
 * - Accessibility: Includes proper alt text and ARIA attributes
 * - Performance: Uses canvas for efficient rendering
 * - Type Safety: Full TypeScript support
 * 
 * @example
 * ```tsx
 * <QRCode 
 *   value="https://example.com/sample/123" 
 *   size={256}
 *   errorCorrectionLevel="H"
 * />
 * ```
 */
export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 200,
  errorCorrectionLevel = 'M',
  fgColor = '#000000',
  bgColor = '#FFFFFF',
  alt = 'QR Code',
  className = '',
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Validate input
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      const err = new Error('QR Code value cannot be empty');
      setError(err.message);
      onError?.(err);
      setIsLoading(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // Reset state
    setError(null);
    setIsLoading(true);

    // Generate QR code
    QRCodeLib.toCanvas(
      canvas,
      value,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      },
      (err) => {
        setIsLoading(false);
        
        if (err) {
          const errorMsg = `Failed to generate QR code: ${err.message}`;
          setError(errorMsg);
          onError?.(new Error(errorMsg));
          console.error('[QRCode] Generation failed:', err);
        }
      }
    );
  }, [value, size, errorCorrectionLevel, fgColor, bgColor, onError]);

  // Error state
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg ${className}`}
        style={{ width: size, height: size }}
        role="alert"
        aria-live="polite"
      >
        <div className="text-center p-4">
          <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
          <p className="text-sm text-red-600 font-medium">QR Code Error</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg ${className}`}
        style={{ width: size, height: size }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="material-symbols-outlined text-gray-400 text-4xl animate-spin">progress_activity</span>
        <span className="sr-only">Generating QR code...</span>
      </div>
    );
  }

  // Canvas rendering
  return (
    <div className={`inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-gray-200 shadow-sm"
        aria-label={alt}
        role="img"
      />
    </div>
  );
};

export default QRCode;
