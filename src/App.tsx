import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { AuthForm } from './components/AuthForm';
import { StreakTracker } from './components/StreakTracker';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app">
      <header>
        <h1>10-dagars utmaning</h1>
        {session && (
          <div className="user-info">
            <span>{session.user.email}</span>
            <button onClick={handleSignOut}>Logga ut</button>
          </div>
        )}
      </header>

      <main>
        {!session ? (
          <AuthForm onAuth={() => {}} />
        ) : (
          <StreakTracker userEmail={session.user.email} />
        )}
      </main>
    </div>
  );
}

export default App; 