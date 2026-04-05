import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Merchandiser from './pages/Merchandiser';
import Admin from './pages/Admin';
import Dispatch from './pages/Dispatch';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import SampleDetails from './pages/SampleDetails';
import Unauthorized from './pages/Unauthorized';
import Locator from './pages/Locator';
import ToastContainer from './components/ToastContainer';
import logoUrl from './assets/logo.png';
import './App.css';

function App() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-[10px] uppercase font-black tracking-widest text-slate-400">Loading CentroFlow Environment</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
           <>
             <SignedIn>
               <Layout><Landing /></Layout>
             </SignedIn>
             <SignedOut>
               <div className="h-screen flex items-center justify-center bg-[#F8FAFC] p-8 relative overflow-hidden">
                 <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-3xl"></div>
                 <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-3xl"></div>
                 
                 <div className="max-w-md w-full p-10 bg-white rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative z-10 text-center animate-in zoom-in duration-500">
                    <div className="mb-8">
                      <img src={logoUrl} alt="" className="w-20 h-20 mx-auto mb-6 object-contain" />
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Centro<span className="text-blue-600">Flow</span></h2>
                      <p className="text-slate-500 font-medium leading-relaxed">The unified intelligence platform for enterprise sample tracking and logistics.</p>
                    </div>
                    
                    <SignInButton mode="modal">
                      <button className="w-full py-4.5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-[0.98] uppercase tracking-widest text-xs">
                        Enter Digital Hub
                      </button>
                    </SignInButton>
                    
                    <div className="mt-10 pt-8 border-t border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       Securely Protected by Clerk Authentication
                    </div>
                 </div>
               </div>
             </SignedOut>
           </>
        } />
        
        {/* Operational Workspace - All wrapped in Journey Context Layout */}
        <Route path="/admin" element={<SignedIn><Layout><Admin /></Layout></SignedIn>} />
        <Route path="/merchandiser" element={<SignedIn><Layout><Merchandiser /></Layout></SignedIn>} />
        <Route path="/locator" element={<SignedIn><Layout><Locator /></Layout></SignedIn>} />
        <Route path="/dispatch" element={<SignedIn><Layout><Dispatch /></Layout></SignedIn>} />
        <Route path="/inventory" element={<SignedIn><Layout><Inventory /></Layout></SignedIn>} />
        <Route path="/reports" element={<SignedIn><Layout><Reports /></Layout></SignedIn>} />
        <Route path="/samples/:id" element={<SignedIn><Layout><SampleDetails /></Layout></SignedIn>} />
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
