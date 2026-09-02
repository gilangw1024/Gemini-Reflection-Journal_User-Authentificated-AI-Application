import React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
      },
      (error) => {
        console.error('Firebase Auth State Error:', error);
        setAuthError(error.message);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] text-[#121212] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 border-4 border-[#121212] border-t-transparent animate-spin mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tight">INITIALIZING SESSION</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0] mt-1.5">
          CONNECTING TO FIREBASE AUTHENTICATION
        </p>
      </div>
    );
  }

  if (currentUser) {
    return <Dashboard user={currentUser} onSignOut={() => setCurrentUser(null)} />;
  }

  return (
    <LandingPage
      onLoginSuccess={() => {}}
      isLoading={authLoading}
      error={authError}
    />
  );
}
