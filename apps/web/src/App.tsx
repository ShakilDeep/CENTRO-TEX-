import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
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
import logoUrl from './assets/logo.png';
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
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={
            <>
              <SignedIn>
                <Layout>
                  <Dashboard />
                </Layout>
              </SignedIn>
              <SignedOut>
                <div className="flex items-center justify-center bg-gray-50 min-h-[calc(100vh-64px)]">
                  <div className="max-w-md w-full space-y-8 p-8 text-center bg-white rounded-2xl shadow-xl border border-gray-100">
                    <div className="flex justify-center mb-6">
                      <img src={logoUrl} alt="CentroFlow Logo" className="w-24 h-24 object-contain" />
                    </div>
                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                      Welcome to CentroFlow
                    </h2>
                    <p className="mt-4 text-lg text-gray-600">
                      The next-generation operations dashboard.
                    </p>
                    <div className="mt-8 flex justify-center space-x-4">
                      <SignedOut>
                        <SignInButton mode="modal">
                          <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                            Sign In
                          </button>
                        </SignInButton>
                      </SignedOut>
                    </div>
                  </div>
                </div>
              </SignedOut>
            </>
          } />
          
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/dispatch" element={<Layout><Dispatch /></Layout>} />
          <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
          <Route path="/samples/:id" element={<Layout><SampleDetails /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </main>

      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
