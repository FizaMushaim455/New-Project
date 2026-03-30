import { useState } from 'react';
import {
  Hand, Eye, Activity, Monitor, AlertTriangle,
  CheckCircle2, ChevronRight, Zap, Info, Bell,
  HelpCircle, Stethoscope, User, ArrowLeft
} from 'lucide-react';

interface GuidePageProps {
  onClose: () => void;
  defaultTab?: 'patient' | 'nurse';
}

const GESTURE_GUIDE = [
  { gesture: 'Closed Fist', meaning: 'HELP', description: 'Make a fist with all fingers curled in.', color: 'red', icon: '✊' },
  { gesture: 'Open Palm', meaning: 'WATER', description: 'Hold your hand flat, all fingers extended.', color: 'cyan', icon: '✋' },
  { gesture: 'Victory Sign', meaning: 'BATHROOM', description: 'Extend index and middle fingers in a V shape.', color: 'violet', icon: '✌️' },
  { gesture: 'ILY Sign', meaning: 'PAIN', description: 'Extend thumb, index and pinky. High urgency alert.', color: 'red', icon: '🤟' },
  { gesture: 'Thumbs Up', meaning: 'YES', description: 'Extend thumb upward. Confirms a request.', color: 'green', icon: '👍' },
  { gesture: 'Thumbs Down', meaning: 'NO', description: 'Extend thumb downward. Declines a request.', color: 'zinc', icon: '👎' },
  { gesture: 'Shaka Sign', meaning: 'CALL NURSE', description: 'Extend thumb and pinky only. Direct nurse call.', color: 'amber', icon: '🤙' },
];

const GAZE_GUIDE = [
  { corner: 'Top-Left', action: 'Water', description: 'Look to the upper-left for 2 seconds to request Water.', color: 'cyan' },
  { corner: 'Top-Right', action: 'Food', description: 'Look to the upper-right for 2 seconds to request Food.', color: 'amber' },
  { corner: 'Bottom-Left', action: 'Help', description: 'Look to the lower-left for 2 seconds to call for Help.', color: 'red' },
  { corner: 'Bottom-Right', action: 'Call Nurse', description: 'Look to the lower-right for 2 seconds to summon your Nurse.', color: 'violet' },
];

const COLOR_MAP: Record<string, string> = {
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
  cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  violet: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  zinc: 'text-zinc-400 bg-zinc-400/10 border-zinc-800',
};

export default function GuidePage({ onClose, defaultTab = 'patient' }: GuidePageProps) {
  const [tab, setTab] = useState<'patient' | 'nurse'>(defaultTab);
  const [gestureHighlight, setGestureHighlight] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#050d1a] text-zinc-100 flex flex-col selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white group"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg tracking-tight">System Guide</h1>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest leading-none mt-1">SilentCare Pro Manual</p>
              </div>
            </div>
          </div>

          <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
            <button
              onClick={() => setTab('patient')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'patient'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Patient
            </button>
            <button
              onClick={() => setTab('nurse')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'nurse'
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Nurse
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Sidebar / Context */}
          <div className="lg:col-span-3 space-y-6">
            <div className={`p-6 rounded-2xl border transition-all ${tab === 'patient' ? 'bg-cyan-500/5 border-cyan-500/15' : 'bg-violet-500/5 border-violet-500/15'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Info className={`w-4 h-4 ${tab === 'patient' ? 'text-cyan-400' : 'text-violet-400'}`} />
                <h2 className="text-xs font-mono uppercase tracking-widest font-bold">Overview</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {tab === 'patient' 
                  ? 'SilentCare Pro uses webcam detection to turn non-verbal intent into human voice. Control your environment with gestures or eye gaze.'
                  : 'Manage ward-wide patient distress alerts in real-time. Triage requests based on AI-assigned urgency levels.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30">
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">Quick Shortcuts</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Blink Pattern</span>
                  <span className="text-red-400 font-mono">SOS</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">OK Gesture</span>
                  <span className="text-cyan-400 font-mono">Send Queue</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-9 space-y-12">
            
            {/* ── PATIENT CONTENT ── */}
            {tab === 'patient' && (
              <>
                <section>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <Hand className="w-6 h-6 text-cyan-400" />
                    Medical Hand Gestures
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {GESTURE_GUIDE.map((g, i) => (
                      <div
                        key={i}
                        onMouseEnter={() => setGestureHighlight(i)}
                        onMouseLeave={() => setGestureHighlight(null)}
                        className={`group p-5 rounded-2xl border transition-all duration-300 ${
                          gestureHighlight === i
                            ? `${COLOR_MAP[g.color]} shadow-lg scale-[1.02]`
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl bg-black/20 w-16 h-16 rounded-xl flex items-center justify-center border border-white/5 transition-transform group-hover:rotate-6">
                              {g.icon}
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-100">{g.gesture}</h4>
                              <p className={`text-[10px] font-black tracking-widest uppercase mt-0.5 ${COLOR_MAP[g.color].split(' ')[0]}`}>
                                Meaning: {g.meaning}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 mt-4 leading-relaxed line-clamp-2">
                          {g.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <Eye className="w-6 h-6 text-violet-400" />
                    Iris Tracking (Gaze)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {GAZE_GUIDE.map((g, i) => (
                      <div key={i} className={`p-5 rounded-2xl border ${COLOR_MAP[g.color]} flex items-start gap-4 transition-all hover:shadow-lg`}>
                        <div className="bg-white/5 p-3 rounded-lg"><Monitor className="w-5 h-5" /></div>
                        <div>
                          <h4 className="font-bold text-sm mb-1">{g.corner} Dwell</h4>
                          <h5 className="text-[10px] font-mono uppercase tracking-widest opacity-60 mb-2">Triggers: {g.action}</h5>
                          <p className="text-xs opacity-70 leading-relaxed">{g.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="p-8 rounded-3xl bg-red-500/5 border border-red-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] -mr-16 -mt-16 rounded-full" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                      <h2 className="text-xl font-bold text-red-400">Emergency SOS Blink</h2>
                    </div>
                    <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed mb-6">
                      For patients under extreme distress who cannot perform hand gestures.
                      The system monitors eyelid velocity for a specific <strong className="text-red-300">Triple-Blink</strong> sequence.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {['Blink 1', 'Blink 2', 'Blink 3'].map((b, i) => (
                        <div key={i} className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
                          {b}
                        </div>
                      ))}
                      <ChevronRight className="w-4 h-4 text-zinc-700 mx-2" />
                      <div className="px-6 py-3 rounded-xl bg-red-500 text-black font-black text-xs animate-pulse">
                        IMMEDIATE NURSE ALERT
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ── NURSE CONTENT ── */}
            {tab === 'nurse' && (
              <>
                <section>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <Bell className="w-6 h-6 text-violet-400" />
                    Urgency Triage Rules
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        level: 'CRITICAL (HIGH)', color: 'red',
                        sources: ['SOS Blink', 'Emotional AI Distress', 'ILY Sign'],
                        advice: 'Response Time: < 60s. Card pulses red with audible alarm.'
                      },
                      {
                        level: 'ALERT (MEDIUM)', color: 'amber',
                        sources: ['Help Gesture', 'Nurse Call Gaze', 'Pain Expression'],
                        advice: 'Response Time: < 5m. Patient requires clinical attention.'
                      },
                      {
                        level: 'GENERAL (LOW)', color: 'green',
                        sources: ['Water/Food Needs', 'Standard Replies'],
                        advice: 'Response Time: Non-urgent. Batch with regular rounds.'
                      }
                    ].map((u, i) => (
                      <div key={i} className={`p-6 rounded-3xl border ${COLOR_MAP[u.color]} flex flex-col md:flex-row gap-6 items-start shadow-sm`}>
                        <div className="md:w-48 shrink-0">
                          <span className="text-xs font-black tracking-[0.2em]">{u.level}</span>
                          <p className="text-[10px] opacity-60 mt-1 font-mono uppercase">{u.advice}</p>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {u.sources.map(s => (
                            <span key={s} className="px-3 py-1.5 rounded-full bg-black/20 border border-current/10 text-[11px] font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <Monitor className="w-6 h-6 text-cyan-400" />
                    Ward Management
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        Live Status Grid
                      </h4>
                      <p className="text-xs text-zinc-500 mb-4 tracking-tight leading-relaxed">
                        The right sidebar shows all ward rooms. Colors update in real-time based on Socket.IO events.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(n => (
                          <div key={n} className={`h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold ${n === 2 ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-black/40 border-zinc-800 text-zinc-600'}`}>
                            RM 10{n}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Resolution Protocol
                      </h4>
                      <ul className="space-y-2">
                        {[
                          'Enter patient room to address need.',
                          'Verify patient ID matches alert.',
                          'Click "Resolve" button on dashboard.'
                        ].map((s, i) => (
                          <li key={i} className="text-xs text-zinc-400 flex gap-2">
                            <span className="text-emerald-500/50 font-mono">0{i+1}</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 bg-black/20">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
            © 2026 SilentCare Pro Clinical Guidelines · SE-506 Project
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-zinc-500">Developer: <strong>Fiza Mushaim</strong></span>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              RETURN TO DASHBOARD
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
