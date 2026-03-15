import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import SampleDetails from './pages/SampleDetails';
import Unauthorized from './pages/Unauthorized';
import Dispatch from './pages/Dispatch';
import Inventory from './pages/Inventory';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import './App.css';

function App() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Only show the Clerk sign-in header when NOT signed in */}
      {!isSignedIn && <Header />}

      {!isSignedIn ? (
        <div className="flex items-center justify-center bg-gray-50 min-h-screen">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Welcome to প্রবাহ
              </h2>
              <p className="mt-4 text-sm text-gray-600">
                Please use the Sign In button above to access your dashboard
              </p>
              <div className="mt-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                  <span className="text-3xl">📦</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/dispatch" element={<Layout><Dispatch /></Layout>} />
          <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
          <Route path="/samples/:id" element={<Layout><SampleDetails /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      )}

      {/* Global toast/notification renderer — always mounted */}
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
