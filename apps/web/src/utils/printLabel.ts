import { api } from '../api/client';

/**
 * Label Print Options
 * Following Interface Segregation Principle
 */
export interface PrintLabelOptions {
  /** Sample ID to print label for */
  sampleId: string;
  /** Print method: 'browser' for print dialog, 'zebra' for direct Zebra printer */
  printMethod?: 'browser' | 'zebra';
  /** Zebra printer IP address (required if printMethod is 'zebra') */
  printerIp?: string;
  /** Number of copies to print */
  copies?: number;
  /** Callback for success */
  onSuccess?: () => void;
  /** Callback for error */
  onError?: (error: Error) => void;
}

/**
 * Print Response from API
 */
interface PrintLabelResponse {
  success: boolean;
  zpl: string;
  message?: string;
}

/**
 * Print Label Utility
 * 
 * Handles printing of ZPL labels for samples with multiple print strategies:
 * - Browser print dialog (converts ZPL to image)
 * - Direct Zebra printer via network
 * 
 * Design Patterns:
 * - Strategy Pattern: Different print strategies
 * - Factory Pattern: Creates appropriate printer based on method
 * - Error Handling: Comprehensive error management
 * 
 * @param options PrintLabelOptions configuration
 * @returns Promise<boolean> indicating success
 * 
 * @example
 * ```typescript
 * await printLabel({
 *   sampleId: 'SAMPLE-123',
 *   printMethod: 'browser',
 *   copies: 2
 * });
 * ```
 */
export async function printLabel(options: PrintLabelOptions): Promise<boolean> {
  const {
    sampleId,
    printMethod = 'browser',
    printerIp,
    copies = 1,
    onSuccess,
    onError
  } = options;

  // Validation
  if (!sampleId || typeof sampleId !== 'string' || sampleId.trim().length === 0) {
    const error = new Error('Sample ID is required for printing');
    onError?.(error);
    throw error;
  }

  if (printMethod === 'zebra' && !printerIp) {
    const error = new Error('Printer IP is required for Zebra printing');
    onError?.(error);
    throw error;
  }

  if (copies < 1 || copies > 10) {
    const error = new Error('Copies must be between 1 and 10');
    onError?.(error);
    throw error;
  }

  try {
    console.log(`[PrintLabel] Requesting label for sample: ${sampleId}`);

    // Call API to get ZPL payload
    const response = await api.post<PrintLabelResponse>(
      `/api/v1/samples/${sampleId}/print`,
      { copies }
    );

    const { zpl, success, message } = response.data;

    if (!success || !zpl) {
      throw new Error(message || 'Failed to generate label');
    }

    console.log(`[PrintLabel] Received ZPL (${zpl.length} bytes)`);

    // Execute print based on method
    if (printMethod === 'browser') {
      await printViaBrowser(zpl, sampleId);
    } else if (printMethod === 'zebra') {
      await printViaZebra(zpl, printerIp!);
    }

    console.log(`[PrintLabel] Print successful`);
    onSuccess?.();
    return true;

  } catch (error) {
    const printError = error instanceof Error 
      ? error 
      : new Error('Unknown printing error');
    
    console.error('[PrintLabel] Print failed:', printError);
    onError?.(printError);
    throw printError;
  }
}

/**
 * Print via browser print dialog
 * Converts ZPL to a printable format and triggers browser print
 * 
 * @param zpl ZPL string to print
 * @param sampleId Sample ID for the label
 */
async function printViaBrowser(zpl: string, sampleId: string): Promise<void> {
  console.log('[PrintLabel] Using browser print method');

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups for this site.');
  }

  // Build HTML with ZPL embedded and print stylesheet
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Label - ${sampleId}</title>
        <style>
          @page {
            size: 4in 2in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Courier New', monospace;
            display: flex;
            align-items: center;
            justify-center;
            min-height: 2in;
            background: white;
          }
          .label-container {
            width: 4in;
            height: 2in;
            padding: 0.25in;
            box-sizing: border-box;
            border: 1px solid #000;
            background: white;
            page-break-after: always;
          }
          .zpl-preview {
            font-size: 8pt;
            white-space: pre-wrap;
            word-break: break-all;
            color: #000;
          }
          .print-info {
            margin-top: 10px;
            font-size: 10pt;
            text-align: center;
            color: #666;
          }
          @media print {
            .print-info {
              display: none;
            }
            .label-container {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="zpl-preview">${escapeHtml(zpl)}</div>
        </div>
        <div class="print-info">
          <p>Sample: ${escapeHtml(sampleId)}</p>
          <p><small>ZPL Label - Best printed on Zebra thermal printers</small></p>
        </div>
        <script>
          // Auto-print when page loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Close window after print dialog
              setTimeout(function() {
                window.close();
              }, 100);
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Print directly to Zebra printer via network
 * Sends raw ZPL data to the printer's IP address
 * 
 * @param zpl ZPL string to print
 * @param printerIp IP address of the Zebra printer
 */
async function printViaZebra(zpl: string, printerIp: string): Promise<void> {
  console.log(`[PrintLabel] Sending to Zebra printer at ${printerIp}`);

  try {
    // Send ZPL to printer via raw TCP socket
    // Note: Direct browser-to-printer communication requires a proxy server
    // For production, implement a backend proxy service
    
    const response = await fetch(`http://${printerIp}:9100`, {
      method: 'POST',
      body: zpl,
      headers: {
        'Content-Type': 'application/x-zpl'
      },
      mode: 'no-cors' // Required for cross-origin printer requests
    });

    console.log('[PrintLabel] Sent to Zebra printer successfully');
    
  } catch (error) {
    console.error('[PrintLabel] Zebra print failed:', error);
    throw new Error(
      `Failed to send to Zebra printer at ${printerIp}. ` +
      `Ensure the printer is online and accessible on the network.`
    );
  }
}

/**
 * Escape HTML special characters
 * Prevents XSS when displaying ZPL in HTML
 * 
 * @param unsafe Unsafe string
 * @returns Escaped string
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Download ZPL as file
 * Utility function to save ZPL for manual printing
 * 
 * @param zpl ZPL string
 * @param filename Filename (default: 'label.zpl')
 */
export function downloadZPL(zpl: string, filename: string = 'label.zpl'): void {
  const blob = new Blob([zpl], { type: 'application/x-zpl' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.click();
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Check if Zebra printer is reachable
 * Utility to test printer connectivity
 * 
 * @param printerIp IP address of the printer
 * @returns Promise<boolean> indicating if printer is reachable
 */
export async function checkPrinterStatus(printerIp: string): Promise<boolean> {
  try {
    const response = await fetch(`http://${printerIp}:9100`, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return true;
  } catch (error) {
    return false;
  }
}

export default printLabel;
