import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY.includes('YOUR_ACTUAL_CLERK_PUBLISHABLE_KEY_HERE')) {
  // Show warning but don't throw error for development
  console.warn('⚠️ Please add your actual Clerk Publishable Key to the .env file')
  console.warn('Get your key from: https://clerk.com/dashboard')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {PUBLISHABLE_KEY && !PUBLISHABLE_KEY.includes('YOUR_ACTUAL_CLERK_PUBLISHABLE_KEY_HERE') ? (
          <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <App />
          </ClerkProvider>
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
              <h2 className="text-2xl font-bold text-center text-gray-900">Setup Required</h2>
              <div className="space-y-4">
                <p className="text-gray-600">To use Clerk authentication, you need to:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Sign up for a free account at <a href="https://clerk.com" className="text-blue-600 hover:underline" target="_blank">clerk.com</a></li>
                  <li>Create a new application in your Clerk dashboard</li>
                  <li>Copy your publishable key from the API Keys section</li>
                  <li>Replace <code className="bg-gray-100 px-1 rounded">pk_test_YOUR_ACTUAL_CLERK_PUBLISHABLE_KEY_HERE</code> in your <code className="bg-gray-100 px-1 rounded">.env</code> file</li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
