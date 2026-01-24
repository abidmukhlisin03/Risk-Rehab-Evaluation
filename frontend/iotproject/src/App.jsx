import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  Activity, 
  Heart, 
  BrainCircuit, 
  Info, 
  Wifi, 
  WifiOff
} from 'lucide-react';

/**
 * Senior Full-Stack Developer: UI/UX Implementation
 * Pure CSS Edition (No Tailwind)
 */

const App = () => {
  const [motionData, setMotionData] = useState([]);
  const [heartRate, setHeartRate] = useState(72);
  const [hrHistory, setHrHistory] = useState([]);
  const [aiConclusion, setAiConclusion] = useState("Initializing system analysis...");
  const [time, setTime] = useState(0);

  // Constants
  const MAX_DATA_POINTS = 50;
  const IDEAL_FREQUENCY = 0.5;

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev + 0.2);
      const ideal = Math.sin(time * IDEAL_FREQUENCY) * 10 + 20;
      const noise = (Math.random() - 0.5) * 2;
      const actual = ideal + noise + (Math.sin(time * 0.1) * 2);

      setMotionData(prev => {
        const newData = [...prev, { time: time.toFixed(1), ideal, actual }];
        return newData.slice(-MAX_DATA_POINTS);
      });

      const hrFluctuation = Math.floor(Math.random() * 3) - 1;
      setHeartRate(prev => Math.max(60, Math.min(140, prev + hrFluctuation)));

      if (Math.random() > 0.98) {
        const insights = ["Symmetry optimal.", "Slight lag detected.", "Steady HR.", "Perfect overlap!"];
        setAiConclusion(insights[Math.floor(Math.random() * insights.length)]);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [time]);

  useEffect(() => {
    setHrHistory(prev => {
      const newData = [...prev, { time: Date.now(), bpm: heartRate }];
      return newData.slice(-40);
    });
  }, [heartRate]);

  const getBpmStatus = (bpm) => {
    if (bpm <= 100) return { key: 'safe', label: 'Rest/Normal', hex: '#10b981' };
    if (bpm <= 120) return { key: 'warning', label: 'Elevated', hex: '#eab308' };
    return { key: 'danger', label: 'Critical', hex: '#ef4444' };
  };

  const hrStatus = getBpmStatus(heartRate);

  return (
    <div className="dashboard-wrapper">
      <style>{`
        :root {
          --bg-main: #020617;
          --bg-card: rgba(15, 23, 42, 0.7);
          --border-color: #1e293b;
          --text-main: #f1f5f9;
          --text-muted: #64748b;
          --accent-blue: #3b82f6;
          --status-safe: #10b981;
          --status-warning: #eab308;
          --status-danger: #ef4444;
        }

        .dashboard-wrapper {
          min-height: 100vh;
          background-color: var(--bg-main);
          color: var(--text-main);
          font-family: 'Inter', -apple-system, sans-serif;
          padding: 2rem;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        }

        .logo h1 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .accent-text { color: var(--accent-blue); }

        .connection-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid rgba(59, 130, 246, 0.5);
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }

        .main-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.5rem;
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
        }

        .motion-card { grid-column: span 2; }
        .ai-card { grid-column: span 3; }

        .card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .card-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        /* Gauge Styling */
        .gauge-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 0;
        }

        .gauge-circle {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          border: 8px solid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.5s ease;
        }

        .gauge-val { font-size: 3rem; font-weight: 900; font-family: monospace; }
        .gauge-unit { font-size: 0.65rem; font-weight: bold; color: var(--text-muted); }

        .status-pill {
          margin-top: 1rem;
          padding: 0.25rem 1rem;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        /* Status Colors */
        .status-safe-theme { color: var(--status-safe); border-color: var(--status-safe); background: rgba(16, 185, 129, 0.1); }
        .status-warning-theme { color: var(--status-warning); border-color: var(--status-warning); background: rgba(234, 179, 8, 0.1); }
        .status-danger-theme { color: var(--status-danger); border-color: var(--status-danger); background: rgba(239, 68, 68, 0.1); }

        .bg-safe { background-color: var(--status-safe); color: #000; }
        .bg-warning { background-color: var(--status-warning); color: #000; }
        .bg-danger { background-color: var(--status-danger); color: #000; }

        /* Dot Grid Graph */
        .dot-grid-container {
          height: 120px;
          background-color: #020617;
          border-radius: 0.75rem;
          border: 1px solid var(--border-color);
          position: relative;
          overflow: hidden;
          background-image: radial-gradient(circle, #334155 1px, transparent 1px);
          background-size: 16px 16px;
          background-position: center;
        }

        .scan-line {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent, rgba(59, 130, 246, 0.05), transparent);
          animation: scan 3s linear infinite;
        }

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* AI Conclusion Box */
        .ai-output-container {
          background: rgba(2, 6, 23, 0.8);
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: 0.5rem;
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .cursor { display: inline-block; width: 10px; height: 18px; background: var(--accent-blue); animation: blink 1s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        @media (max-width: 1024px) {
          .main-grid { grid-template-columns: 1fr; }
          .motion-card, .ai-card { grid-column: span 1; }
        }
      `}</style>

      <header>
        <div className="logo">
          <h1>REHAB<span className="accent-text">PRO</span></h1>
          <p className="card-subtitle">Biometric Dashboard v4.0</p>
        </div>
        <div className="connection-badge">
          <WifiOff size={14} /> SIMULATION MODE
        </div>
      </header>

      <main className="main-grid">
        {/* SECTION 1: MOTION */}
        <section className="card motion-card">
          <div className="card-header">
            <div>
              <h2 className="card-title"><Activity color="var(--accent-blue)" /> Motion Monitor</h2>
              <p className="card-subtitle">Overlap lines for optimal rehabilitation</p>
            </div>
          </div>
          <div style={{ height: 350, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={motionData}>
                <defs>
                  <linearGradient id="glowArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis hide dataKey="time" />
                <YAxis domain={[-5, 45]} hide />
                <Line type="monotone" dataKey="ideal" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={0} />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} fill="url(#glowArea)" animationDuration={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SECTION 2: HEART RATE */}
        <section className="card">
          <h2 className="card-title">
            <Heart color={hrStatus.hex} /> Cardiac Status
          </h2>
          
          <div className="gauge-section">
            <div className={`gauge-circle status-${hrStatus.key}-theme`}>
              <span className="gauge-val">{heartRate}</span>
              <span className="gauge-unit">BPM</span>
            </div>
            <div className={`status-pill bg-${hrStatus.key}`}>
              {hrStatus.label}
            </div>
          </div>

          <div className="dot-grid-container">
            <div className="scan-line" />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hrHistory} margin={{ top: 10, bottom: 10, left: -5, right: -5 }}>
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Line 
                  type="monotone" 
                  dataKey="bpm" 
                  stroke={hrStatus.hex} 
                  strokeWidth={3} 
                  dot={false} 
                  filter="url(#glow)"
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SECTION 3: AI CONCLUSION */}
        <section className="card ai-card">
          <div className="card-header">
            <h2 className="card-title"><BrainCircuit color="var(--accent-blue)" /> AI Insights</h2>
          </div>
          <div className="ai-output-container">
            <div className="cursor" />
            <div style={{ fontFamily: 'monospace', color: '#93c5fd' }}>
              {aiConclusion}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;