import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { supabase } from '../lib/supabaseClient';

// Konstanter
const CHALLENGE_LENGTH = 10;
const USERS = {
  admin: { username: 'admin', password: 'admin123' },
  T: { username: 'T', password: 'T123' },
  V: { username: 'V', password: 'V123' },
  M: { username: 'M', password: 'M123' },
  P: { username: 'P', password: 'P123' }
};

// Katt-avatars för varje användare
const USER_AVATARS = {
  T: '😹',    // Skrattande katt som gråter
  V: '😺',    // Leende katt
  M: '😻',    // Kärleksfull katt med hjärtan
  P: '😽',    // Kissande katt
  admin: '👑'  // Krona för admin
};

// Hjälpfunktioner
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const calculateDates = (startDate) => {
  if (!startDate) return [];
  const dates = [];
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [];
  
  for (let i = 0; i < CHALLENGE_LENGTH; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const isFutureDate = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
};

const getInitialStreaks = () => {
  const initialStreaks = {};
  Object.keys(USERS).forEach(user => {
    if (user !== 'admin') {
      initialStreaks[user] = Array(CHALLENGE_LENGTH).fill(false);
    }
  });
  return initialStreaks;
};

// Custom hooks
const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const savedValue = localStorage.getItem(key);
      return savedValue ? JSON.parse(savedValue) : initialValue;
    } catch (error) {
      console.error(`Kunde inte läsa ${key} från localStorage:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value instanceof Date) {
        localStorage.setItem(key, value.toISOString());
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Kunde inte spara ${key} i localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
};

const useNotification = (duration = 3000) => {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const show = (msg) => {
    setMessage(msg);
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), duration);
  };

  return { message, isVisible, show };
};

// Komponenter
const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { message, isVisible, show } = useNotification();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      show('Vänligen fyll i både användarnamn och lösenord');
      return;
    }

    if (!USERS[trimmedUsername]) {
      show('Ogiltigt användarnamn');
      return;
    }

    if (USERS[trimmedUsername].password !== trimmedPassword) {
      show('Felaktigt lösenord');
      return;
    }

    onLogin(trimmedUsername);
    setUsername('');
    setPassword('');
  };

  return (
    <div className="streak-tracker">
      <h1>🎯 10-dagars träningsutmaning 🎯</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Användarnamn (P, M, V, T eller admin)..."
          className="login-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lösenord..."
          className="login-input"
        />
        <button type="submit" className="login-button">Logga in 🚀</button>
      </form>
      {isVisible && (
        <div className="error-message">
          {message}
        </div>
      )}
    </div>
  );
};

const DayCell = ({ day, date, isCompleted, isClickable, isFuture, onClick, isAdmin }) => {
  const getIcon = () => {
    if (isCompleted) return '⭐';
    if (isFuture && !isAdmin) return '🔒';
    return isClickable ? '🎯' : '🔒';
  };

  return (
    <div
      className={`day-cell ${isCompleted ? 'completed' : ''} ${
        isClickable ? 'clickable' : 'locked'
      }`}
      onClick={onClick}
    >
      {getIcon()}
    </div>
  );
};

const ChallengeHistory = ({ challenges }) => {
  if (challenges.length === 0) return null;

  return (
    <div className="history-section">
      <h2>🏆 Tidigare utmaningar 🏆</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Mål</th>
            <th>Startdatum</th>
            <th>Slutfört datum</th>
            <th>Status</th>
            <th>Framgång</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((challenge, index) => (
            <tr key={index}>
              <td>🎯 {challenge.goal}</td>
              <td>📅 {new Date(challenge.startDate).toLocaleDateString('sv-SE')}</td>
              <td>📅 {challenge.completedAt}</td>
              <td>
                {challenge.status === 'Fullföljd' ? '✅ Fullföljd' : '❌ Avbruten'}
              </td>
              <td>
                {challenge.completedBy?.map(({ user, completedDays }) => (
                  <div key={user} className="completion-status">
                    {user}: {completedDays}/10 dagar
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StreakTracker = () => {
  const { width, height } = useWindowSize();
  const [currentUser, setCurrentUser] = useState(null);
  const [streaks, setStreaks] = useState({});
  const [goal, setGoal] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [dates, setDates] = useState([]);
  const [history, setHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastCompletedDay, setLastCompletedDay] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const dayRefs = useRef({});

  const isAdmin = currentUser === 'admin';

  // Ladda data från Supabase
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      // Hämta aktiv utmaning
      const { data: activeChallenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .single();

      if (challengeError) throw challengeError;

      if (activeChallenge) {
        setGoal(activeChallenge.goal);
        setStartDate(new Date(activeChallenge.start_date));
        setDates(calculateDates(new Date(activeChallenge.start_date)));

        // Hämta användarnas framsteg
        const { data: progress, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('challenge_id', activeChallenge.id);

        if (progressError) throw progressError;

        // Konvertera framsteg till streaks-format
        const newStreaks = {};
        progress.forEach(p => {
          if (!newStreaks[p.username]) {
            newStreaks[p.username] = Array(CHALLENGE_LENGTH).fill(false);
          }
          newStreaks[p.username][p.day_number - 1] = p.completed;
        });
        setStreaks(newStreaks);
      }

      // Hämta historik
      const { data: historyData, error: historyError } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setHistory(historyData);

    } catch (error) {
      console.error('Error loading data:', error);
      showError('Kunde inte ladda data');
    }
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogin = (username) => {
    if (!USERS[username]) {
      showError('Ogiltigt användarnamn');
      return;
    }
    setCurrentUser(username);
    showSuccess(`Välkommen ${username}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showSuccess('Du är nu utloggad');
  };

  const handleDayClick = async (username, dayIndex) => {
    try {
      const { data: activeChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('status', 'active')
        .single();

      if (!activeChallenge) {
        showError('Ingen aktiv utmaning hittades');
        return;
      }

      const isCompleted = streaks[username]?.[dayIndex] || false;
      
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          challenge_id: activeChallenge.id,
          username,
          day_number: dayIndex + 1,
          completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        });

      if (error) throw error;

      // Uppdatera lokal state
      const newStreaks = { ...streaks };
      if (!newStreaks[username]) {
        newStreaks[username] = Array(CHALLENGE_LENGTH).fill(false);
      }
      newStreaks[username][dayIndex] = !isCompleted;
      setStreaks(newStreaks);

      showSuccess(`Dag ${dayIndex + 1} ${!isCompleted ? 'markerad' : 'avmarkerad'}!`);

    } catch (error) {
      console.error('Error updating progress:', error);
      showError('Kunde inte uppdatera framsteg');
    }
  };

  const handleSetGoal = async () => {
    if (!newGoal.trim()) {
      showError('Vänligen ange ett mål');
      return;
    }

    try {
      // Avsluta eventuell aktiv utmaning
      const { data: activeChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('status', 'active')
        .single();

      if (activeChallenge) {
        await supabase
          .from('challenges')
          .update({ status: 'completed', end_date: new Date().toISOString() })
          .eq('id', activeChallenge.id);
      }

      // Skapa ny utmaning
      const { data: newChallenge, error } = await supabase
        .from('challenges')
        .insert({
          goal: newGoal.trim(),
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setGoal(newGoal.trim());
      setNewGoal('');
      setStartDate(new Date());
      setDates(calculateDates(new Date()));
      setStreaks({});
      setIsCompleted(false);
      showSuccess('Nytt mål satt!');

    } catch (error) {
      console.error('Error setting goal:', error);
      showError('Kunde inte sätta nytt mål');
    }
  };

  const calculateProgress = () => {
    if (!streaks || Object.keys(streaks).length === 0) return 0;
    
    const totalDays = CHALLENGE_LENGTH * (Object.keys(USERS).length - 1); // Exkludera admin
    const completedDays = Object.values(streaks).reduce((total, userStreaks) => {
      return total + (userStreaks?.filter(Boolean).length || 0);
    }, 0);
    
    return Math.round((completedDays / totalDays) * 100);
  };

  // Kontrollera om alla användare har klarat en specifik dag
  const isDayCompletedByAll = (dayIndex) => {
    return Object.values(streaks).every(userStreaks => 
      userStreaks && userStreaks[dayIndex]
    );
  };

  // Kontrollera om någon användare har klarat en specifik dag
  const isDayAttempted = (dayIndex) => {
    return Object.values(streaks).some(userStreaks => 
      userStreaks && userStreaks[dayIndex]
    );
  };

  // Funktion för att kolla om alla användare har klarat utmaningen
  const isChallengeCompleted = () => {
    return Object.keys(USERS).every(username => {
      if (username === 'admin') return true; // Skip admin
      const userStreaks = streaks[username] || Array(CHALLENGE_LENGTH).fill(false);
      return userStreaks.every(day => day === true);
    });
  };

  // Effekt för att hantera challenge completion
  useEffect(() => {
    if (isChallengeCompleted() && !isCompleted) {
      setIsCompleted(true);
      showSuccess('Grattis! Alla har klarat utmaningen! 🎉');
    }
  }, [streaks]);

  const getMotivationalText = (progress) => {
    if (progress === 0) return "Låt oss börja resan mot målet! 🚀";
    if (progress < 25) return "Bra början! Fortsätt så! 💪";
    if (progress < 50) return "Halvvägs där! Du klarar det! 🌟";
    if (progress < 75) return "Så nära nu! Ge inte upp! ⭐";
    if (progress < 100) return "Nästan där! Sista spurt! 🏃‍♂️";
    return "Fantastiskt jobbat! Målet är nått! 🎉";
  };

  const handleCompleteChallenge = async (challengeId) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ completed: true })
        .eq('id', challengeId)

      if (error) throw error

      // Uppdatera UI
      setHistory(prev => prev.map(c => 
        c.id === challengeId ? { ...c, completed: true } : c
      ))
    } catch (error) {
      console.error('Error completing challenge:', error)
    }
  }

  const clearLocalStorage = () => {
    localStorage.removeItem('streakData')
    setHistory([])
    setStreaks({})
    setGoal('')
    setNewGoal('')
    setStartDate(null)
    setDates([])
    setIsCompleted(false)
    setShowConfetti(false)
    setShowReward(false)
    setLastCompletedDay(null)
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="streak-tracker">
      <div className="header">
        <h1>🎯 10-dagars träningsutmaning 🎯</h1>
        <div className="user-info">
          <span>👋 Hej {currentUser}!</span>
          <button onClick={handleLogout} className="logout-button">Logga ut</button>
        </div>
      </div>
      
      {currentUser === 'admin' && (
        <div className="admin-controls">
          <div className="goal-input">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Ange nytt mål..."
              className="goal-input-field"
            />
            <button onClick={handleSetGoal} className="set-goal-button">
              Sätt mål
            </button>
          </div>
          <div className="admin-buttons">
            <button onClick={handleCompleteChallenge} className="admin-button complete">
              Avsluta utmaning nu ✅
            </button>
          </div>
          <button onClick={clearLocalStorage} className="admin-button clear">
            Rensa data
          </button>
        </div>
      )}

      {currentUser && (
        <div className="goal-display">
          <span className="goal-label">Nuvarande Mål</span>
          <div 
            className="goal-text"
            style={{
              '--progress': `${calculateProgress()}%`,
              '--progress-text': `${calculateProgress()}%`
            }}
          >
            <div className="goal-text-content">
              {goal || 'Inget mål satt ännu'}
            </div>
          </div>
          <div className="goal-motivation">
            {getMotivationalText(calculateProgress())}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <div className="grid-container">
        <div className="grid-header">
          <div className="header-cell">Användare</div>
          {Array.from({ length: CHALLENGE_LENGTH }, (_, i) => (
            <div 
              key={i} 
              className={`day-cell header ${
                isDayCompletedByAll(i) ? 'all-completed' : 
                isDayAttempted(i) ? 'partially-completed' : ''
              }`}
            >
              <span>Dag {i + 1}</span>
              <span className="date-label">{formatDate(dates[i])}</span>
            </div>
          ))}
        </div>

        {Object.keys(USERS).map(username => {
          if (username === 'admin') return null;
          const userStreaks = streaks[username] || Array(CHALLENGE_LENGTH).fill(false);
          
          return (
            <div key={username} className="user-row">
              <div className="user-cell">
                <div className="user-info">
                  <span className="avatar">{USER_AVATARS[username]}</span>
                  <span className="username">{username}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(userStreaks.filter(Boolean).length / CHALLENGE_LENGTH) * 100}%`
                    }}
                  />
                </div>
              </div>
              {Array.from({ length: CHALLENGE_LENGTH }, (_, dayIndex) => {
                const isFuture = isFutureDate(dates[dayIndex]);
                const isCompleted = userStreaks[dayIndex];
                const canClick = (currentUser === 'admin' || (currentUser === username && !isFuture)) && !isCompleted;
                
                return (
                  <div
                    key={dayIndex}
                    className={`day-cell ${isCompleted ? 'completed' : ''} ${
                      isFuture && !isAdmin ? 'future' : ''
                    } ${canClick ? 'clickable' : ''}`}
                    onClick={() => canClick && handleDayClick(username, dayIndex)}
                  >
                    {isCompleted ? '✅' : isFuture && !isAdmin ? '🔒' : '⬜'}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {isCompleted && (
        <div className="challenge-completed">
          <div className="celebration">
            <span>🎉</span>
            <span>🎊</span>
            <span>🎈</span>
            <span>🌟</span>
            <span>🏆</span>
          </div>
          <h2>Grattis! Alla har klarat utmaningen!</h2>
          <p>Ni är alla fantastiska! 🌟</p>
          <div className="confetti-container">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="confetti" style={{
                '--delay': `${Math.random() * 5}s`,
                '--x': `${Math.random() * 100}vw`,
                '--color': `hsl(${Math.random() * 360}, 100%, 50%)`
              }} />
            ))}
          </div>
        </div>
      )}

      <ChallengeHistory challenges={history} />
    </div>
  );
}

export default StreakTracker; 