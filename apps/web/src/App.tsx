import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthContext } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import SampleDetails from './pages/SampleDetails';
import Unauthorized from './pages/Unauthorized';
import Dispatch from './pages/Dispatch';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import './App.css';

function App() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
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
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch"
          element={
            <ProtectedRoute>
              <Layout><Dispatch /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Layout><Inventory /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/samples/:id"
          element={
            <ProtectedRoute>
              <Layout><SampleDetails /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <Layout><Admin /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={['ADMIN', 'DISPATCH']} roleType="any">
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
