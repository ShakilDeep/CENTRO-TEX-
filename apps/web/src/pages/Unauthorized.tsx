import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Unauthorized Page Component
 * 
 * Displays a user-friendly message when access is denied due to:
 * - Insufficient role
 * - Missing permissions
 * - Other authorization failures
 * 
 * Features:
 * - Shows detailed reason for denial
 * - Provides navigation options
 * - Logs access attempt for security audit
 */
const Unauthorized: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract state passed from ProtectedRoute
  const state = location.state as {
    from?: string;
    reason?: string;
    timestamp?: string;
  } | null;

  const attemptedPath = state?.from || 'a protected resource';
  const denialReason = state?.reason || 'Insufficient permissions';
  const timestamp = state?.timestamp || new Date().toISOString();

  // Log for security audit
  React.useEffect(() => {
    console.warn('[Unauthorized Page] Access denial displayed', {
      attemptedPath,
      reason: denialReason,
      timestamp,
      currentPath: location.pathname
    });
  }, [attemptedPath, denialReason, timestamp, location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-6">
            <svg
              className="h-16 w-16 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Access Denied
          </h1>
          <h2 className="text-xl font-medium text-gray-700 mb-4">
            403 - Forbidden
          </h2>
          <p className="text-base text-gray-600 mb-2">
            You don't have permission to access{' '}
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {attemptedPath}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {denialReason}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Return to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact your system administrator.
          </p>
          {timestamp && (
            <p className="text-xs text-gray-400 mt-2">
              Incident ID: {timestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
