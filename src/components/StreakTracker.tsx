import React, { useEffect, useState } from 'react';
import { supabase, Streak, Challenge } from '../lib/supabaseClient';

interface StreakTrackerProps {
  userEmail: string;
}

export const StreakTracker: React.FC<StreakTrackerProps> = ({ userEmail }) => {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    fetchData();
  }, [userEmail]);

  const fetchData = async () => {
    const { data: challengeData } = await supabase
      .from('challenge')
      .select('*')
      .single();

    const { data: streaksData } = await supabase
      .from('streaks')
      .select('*')
      .order('day', { ascending: true });

    setChallenge(challengeData);
    setStreaks(streaksData || []);
    setIsAdmin(challengeData?.admin_email === userEmail);
  };

  const toggleDay = async (day: number) => {
    const existingStreak = streaks.find(s => s.day === day && s.name === userEmail);
    
    if (existingStreak) {
      const { error } = await supabase
        .from('streaks')
        .update({ complete: !existingStreak.complete })
        .eq('id', existingStreak.id);
      
      if (!error) {
        setStreaks(streaks.map(s => 
          s.id === existingStreak.id ? { ...s, complete: !s.complete } : s
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('streaks')
        .insert([{ name: userEmail, day, complete: true }])
        .select();

      if (!error && data) {
        setStreaks([...streaks, data[0]]);
      }
    }
  };

  const resetChallenge = async () => {
    const { error } = await supabase.from('streaks').delete().neq('id', 0);
    if (!error) {
      setStreaks([]);
    }
  };

  const updateGoal = async () => {
    if (!newGoal) return;

    const { error } = await supabase
      .from('challenge')
      .upsert({ goal: newGoal, admin_email: userEmail });

    if (!error) {
      setChallenge({ ...challenge!, goal: newGoal });
      setNewGoal('');
    }
  };

  const allComplete = streaks.length === 40 && streaks.every(s => s.complete);

  return (
    <div className="streak-tracker">
      <h2>10-dagars utmaning</h2>
      
      {challenge && (
        <div className="goal">
          <h3>Mål: {challenge.goal}</h3>
        </div>
      )}

      {isAdmin && (
        <div className="admin-controls">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Nytt mål..."
          />
          <button onClick={updateGoal}>Uppdatera mål</button>
          <button onClick={resetChallenge}>Återställ utmaning</button>
        </div>
      )}

      <div className="streak-grid">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((day) => {
          const userStreak = streaks.find(s => s.day === day && s.name === userEmail);
          return (
            <div
              key={day}
              className={`day-cell ${userStreak?.complete ? 'complete' : ''}`}
              onClick={() => toggleDay(day)}
            >
              Dag {day}
            </div>
          );
        })}
      </div>

      {allComplete && (
        <div className="reward">
          <h3>Grattis! 🎉</h3>
          <p>Alla har slutfört utmaningen!</p>
        </div>
      )}
    </div>
  );
}; 