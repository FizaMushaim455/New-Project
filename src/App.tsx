import { useState } from 'react';
import Login from './components/Login';
import PatientDashboard from './components/PatientDashboard';
import NurseDashboard from './components/NurseDashboard';

export interface User {
  name: string;
  room: string;
  role: 'patient' | 'nurse';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'nurse') {
    return <NurseDashboard user={user} onLogout={handleLogout} />;
  }

  return <PatientDashboard user={user} onLogout={handleLogout} />;
}
