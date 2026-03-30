import React, { useEffect, useRef, useState } from "react";
import { 
  Stethoscope, 
  User, 
  Hand, 
  Eye, 
  Activity, 
  Monitor, 
  ChevronRight, 
  BrainCircuit, 
  Sparkle,
  GraduationCap,
  HelpCircle
} from "lucide-react";
import "./Landing.css";
import GuideModal from './GuideModal';

interface LandingProps {
  onEnter: (role: "patient" | "nurse") => void;
  onShowGuide: () => void;
}

export default function Landing({ onEnter, onShowGuide }: LandingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const particles: Particle[] = [];
    const particleCount = 100;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      color: string;

      constructor() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.color = Math.random() > 0.5 ? "0, 200, 255" : "124, 111, 224";
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);
      
      particles.forEach((p, idx) => {
        p.update();
        p.draw();

        // Draw connections
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.1 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      
      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="landing-root">
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <div className="nav-logo-icon">
            <Activity className="w-5 h-5 text-white" />
          </div>
          Silent<span>Care</span> Pro
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Project Authorized By</span>
            <span className="text-xs font-semibold text-white">Sir Hassan Tariq</span>
          </div>
          <button 
            onClick={onShowGuide}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg text-sm font-bold text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>
          <button 
            onClick={() => onEnter("nurse")}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform"
          >
            Launch System
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="max-w-5xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8">
            <Sparkle className="w-3 h-3" />
            Medical-Grade Multi-Modal AI
          </div>
          
          <h1 className="hero-title">
            <span className="line1">SilentCare Pro</span>
            <span className="text-zinc-400 text-2xl md:text-4xl block mt-4 font-light">Empowering the Voiceless Through Gemini AI</span>
          </h1>
          
          <p className="hero-sub font-medium">
            Bridging the gap for non-verbal and paralyzed patients using high-precision Computer Vision, 
            Action Landmarks, and Generative AI to translate intent into voice.
          </p>

          <div className="portal-row">
            <div className="glass-card portal-card" onClick={() => onEnter("nurse")}>
              <div className="portal-icon">
                <Stethoscope className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Nurse Hub</h3>
              <p className="text-sm text-zinc-400">Command Center with ward live status and urgency alerts.</p>
              <div className="mt-4 flex items-center text-cyan-400 font-bold text-xs">
                ENTER STATION <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            <div className="glass-card portal-card" onClick={() => onEnter("patient")}>
              <div className="portal-icon bg-[#7c6fe0]/10 text-[#a89cf7]">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Patient Dashboard</h3>
              <p className="text-sm text-zinc-400">Gesture and Gaze-dwell interactions for active communication.</p>
              <div className="mt-4 flex items-center text-violet-400 font-bold text-xs">
                OPEN INTERFACE <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>

          <div className="branding-bar">
            <div className="branding-item">
              <User className="w-4 h-4 text-cyan-400" />
              Developer: <strong>Fiza Mushaim</strong>
            </div>
            <div className="branding-item">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              AG Number: <strong>2023-ag-9944</strong>
            </div>
            <div className="branding-item">
              <BrainCircuit className="w-4 h-4 text-cyan-400" />
              Big Data Analysis (SE-506)
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Core Intelligence</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Our system processes 478 face landmarks and 21 hand joints at 60fps to ensure reliability 
            in clinical environments.
          </p>
        </div>

        <div className="features-grid">
          <div className="glass-card feat-card">
            <img src="/images/feat-gesture.png" alt="Gesture" className="feat-img" />
            <div className="feat-content">
              <div className="flex items-center gap-2 mb-4">
                <Hand className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400 uppercase">Gesture-to-Speech</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Sign-Language Translation</h4>
              <p className="text-sm text-zinc-400">Uses Gemini 1.5 Flash to convert hand landmarks into context-aware sentences.</p>
            </div>
          </div>

          <div className="glass-card feat-card">
            <img src="/images/feat-gaze.png" alt="Gaze" className="feat-img" />
            <div className="feat-content">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-violet-400" />
                <span className="text-xs font-bold text-violet-400 uppercase">Gaze Tracking</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Dwell-Based Interaction</h4>
              <p className="text-sm text-zinc-400">Quadriplegic support allowing selection of needs through iris tracking.</p>
            </div>
          </div>

          <div className="glass-card feat-card">
            <img src="/images/feat-nurse.png" alt="Nurse" className="feat-img" />
            <div className="feat-content">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase">Nurse Station</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Real-time Ward Mapping</h4>
              <p className="text-sm text-zinc-400">Live Socket.IO updates for distress alerts with urgency strobes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-white/5 bg-black/20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-sm text-zinc-500 mb-2">© 2026 SilentCare Pro Clinical Systems</p>
          <p className="text-xs text-zinc-600">
            Authorized by: Sir Hassan Tariq &bull; Department of Software Engineering &bull; UET
          </p>
        </div>
      </footer>
    </div>
  );
}
