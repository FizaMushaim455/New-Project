import { useState } from 'react';
import Login from './components/Login';
import PatientDashboard from './components/PatientDashboard';
import NurseDashboard from './components/NurseDashboard';
import Landing from './components/Landing';
import GuidePage from './components/GuidePage';

export interface User {
  name: string;
  room: string;
  role: 'patient' | 'nurse';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [initialRole, setInitialRole] = useState<'patient' | 'nurse'>('patient');

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    setShowLanding(true);
    setShowGuide(false);
  };

  const handleEnterApp = (role: 'patient' | 'nurse') => {
    setInitialRole(role);
    setShowLanding(false);
  };

  if (showGuide) {
    const role = user?.role || initialRole;
    return <GuidePage onClose={() => setShowGuide(false)} defaultTab={role} />;
  }

  if (showLanding && !user) {
    return <Landing onEnter={handleEnterApp} onShowGuide={() => setShowGuide(true)} />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} initialRole={initialRole} />;
  }

  if (user.role === 'nurse') {
    return <NurseDashboard user={user} onLogout={handleLogout} onShowGuide={() => setShowGuide(true)} />;
  }

  return <PatientDashboard user={user} onLogout={handleLogout} onShowGuide={() => setShowGuide(true)} />;
}
