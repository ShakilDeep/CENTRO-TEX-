import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser, useClerk } from '@clerk/clerk-react';
import logoUrl from '../assets/logo.png';

export default function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <img src={logoUrl} alt="CentroFlow Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">CentroFlow</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition shadow-sm">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            
            <SignedIn>
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {user?.firstName || user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.emailAddresses?.[0]?.emailAddress}
                  </p>
                </div>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-9 h-9 border-2 border-blue-50 transition-all hover:border-blue-200"
                    }
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}
