import { useState, FormEvent } from 'react';
import { UserCircle, Hand, ArrowRight, Stethoscope, User } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { name: string; room: string; role: 'patient' | 'nurse' }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [role, setRole] = useState<'patient' | 'nurse'>('patient');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && (role === 'nurse' || room.trim())) {
      onLogin({ name, room: role === 'nurse' ? 'Station' : room, role });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans text-zinc-50">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden relative z-10">
        <div className="p-10 text-center relative overflow-hidden border-b border-zinc-800">
          <div className="relative z-10">
            <div className="bg-zinc-950 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-800 shadow-[0_0_30px_rgba(6,182,212,0.15)] transform rotate-3">
              <Hand className="w-10 h-10 text-cyan-400 transform -rotate-3" />
            </div>
            <h1 className="text-4xl font-display font-bold text-white tracking-tight mb-2">SilentCare</h1>
            <p className="text-zinc-400 font-mono text-xs tracking-[0.2em] uppercase">System Access</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-zinc-500 mb-3 uppercase tracking-widest">Select Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`py-4 px-4 rounded-xl border font-medium transition-all flex flex-col items-center gap-3 ${
                    role === 'patient' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <User className="w-6 h-6" />
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('nurse')}
                  className={`py-4 px-4 rounded-xl border font-medium transition-all flex flex-col items-center gap-3 ${
                    role === 'nurse' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <Stethoscope className="w-6 h-6" />
                  Nurse
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-xs font-mono text-zinc-500 mb-2 uppercase tracking-widest">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserCircle className="h-5 w-5 text-zinc-600" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-medium focus:bg-zinc-900 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none placeholder:text-zinc-600"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {role === 'patient' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label htmlFor="room" className="block text-xs font-mono text-zinc-500 mb-2 uppercase tracking-widest">
                    Room Number
                  </label>
                  <input
                    type="text"
                    id="room"
                    required={role === 'patient'}
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="block w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-medium focus:bg-zinc-900 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none placeholder:text-zinc-600"
                    placeholder="e.g. 104A"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5"
          >
            Initialize Session
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
