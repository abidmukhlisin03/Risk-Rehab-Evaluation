import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ComposedChart,
  Area,
  Line,
  Label,
  BarChart, // Added for History
  Bar       // Added for History
} from 'recharts';
import { 
  Zap,
  Heart, 
  BrainCircuit, 
  Activity, 
  Wifi,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  Play,
  Square,
  History,   // Added
  TrendingUp // Added
} from 'lucide-react';

/**
 * RehabAI: Smart Wrist Assistant AI
 * Professional Healthcare Theme - Light & Dark Mode Support
 * Integrated with Functional Session Control & MySQL History
 */

// --- NEW SUB-COMPONENT: Exercise Overview ---
const ExerciseOverview = ({ backendUrl, refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [overview, setOverview] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch(`${backendUrl}/exercise-overview`);
        if (!res.ok) return; // Handle errors gracefully
        const data = await res.json();
        setHistory(data.history || []);
        setOverview(data.ai_overview || "No data available.");
      } catch (e) {
        console.error("Overview fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [backendUrl, refreshTrigger]); // Refreshes when parent session stops

  if (loading) return <div className="p-4 text-center opacity-50" style={{padding:'1rem', textAlign:'center'}}>Loading history...</div>;

  return (
    <div className="neural-card mt-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', display: 'block', height: 'auto', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
         <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
           <TrendingUp size={20} className="text-purple-500" style={{color: '#a855f7'}} /> 
           PATIENT PROGRESS OVERVIEW
         </h3>
         <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>LAST 5 SESSIONS</span>
      </div>

      <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: Chart */}
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="date" tickFormatter={(val) => val ? val.split(' ')[0].slice(5) : ''} fontSize={10} stroke="var(--text-muted)" />
              <YAxis fontSize={10} stroke="var(--text-muted)" />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', color: '#000'}} />
              <Bar dataKey="accuracy" fill="var(--medical-blue)" name="Accuracy %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: AI Trend Analysis */}
        <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '1.5rem', borderRadius: '1rem' }}>
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
             <History size={24} className="text-blue-500" style={{color: '#3b82f6'}} />
             <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)' }}>TREND ANALYSIS</span>
           </div>
           <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
             {overview}
           </p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [sensorData, setSensorData] = useState([]);
  const [heartRate, setHeartRate] = useState(0);
  const [hrHistory, setHrHistory] = useState([]);
  const [aiConclusion, setAiConclusion] = useState("");
  const [riskLevel, setRiskLevel] = useState("Low");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Session Control States
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [seconds, setSeconds] = useState(0);
  
  // NEW: Controls visibility of the footer
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // NEW: Triggers refresh of the sub-component
  const [refreshOverviewToken, setRefreshOverviewToken] = useState(0); 
  
  const timeRef = useRef(0);
  const intervalRef = useRef(null);

  // --- CONFIGURATION ---
  const MAX_DATA_POINTS = 30;
  const BACKEND_URL = "http://localhost:8000"; 
  const IDEAL_FREQ = 0.3;

  // --- Timer Logic for Session Control ---
  useEffect(() => {
    let timerInterval = null;
    if (isSessionActive) {
      timerInterval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerInterval);
    }
    return () => clearInterval(timerInterval);
  }, [isSessionActive]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Handle Start/Stop Button Logic ---
  const toggleSession = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isSessionActive) {
        // --- STOP SESSION ---
        const response = await fetch(`${BACKEND_URL}/stop-session`, { method: 'POST' });
        const data = await response.json();
        
        setIsSessionActive(false);
        
        // 1. Set the text (Handle various response formats)
        if (data.analysis) {
            setAiConclusion(data.analysis);
        } else if (data.message) {
            setAiConclusion(data.message);
        } else {
            setAiConclusion("Session saved to MySQL.");
        }

        // 2. REVEAL the footer now that we have data
        setShowAnalysis(true);
        
        // 3. Trigger History Refresh
        setRefreshOverviewToken(prev => prev + 1);

      } else {
        // --- START SESSION ---
        await fetch(`${BACKEND_URL}/start-session`, { method: 'POST' });
        
        setIsSessionActive(true);
        setSeconds(0);
        
        // 1. HIDE the footer while exercising
        setShowAnalysis(false);
        // 2. Clear old text
        setAiConclusion(""); 
      }
    } catch (error) {
      console.error("Error toggling session:", error);
      setIsSessionActive(false);
      setAiConclusion("Error connecting to backend database.");
      setShowAnalysis(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Backend Integration Logic (Polling 1Hz) ---
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s Timeout

        const response = await fetch(`${BACKEND_URL}/get-rehab-status`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (isMounted) {
          setConnectionStatus('active');
          setHeartRate(data.heart_rate || 0);
          setRiskLevel(data.risk_level || "Low");
          
          // Sync recording state just in case
          if (data.is_recording !== undefined && !isProcessing) {
             setIsSessionActive(data.is_recording);
             // If backend says we are recording, ensure analysis is hidden
             if(data.is_recording) setShowAnalysis(false);
          }

          // Persistence Check: If we refreshed the page, but the backend has a finished result
          if (!isSessionActive && !showAnalysis && data.ai_summary && data.ai_summary.includes("Medical Conclusion")) {
              setAiConclusion(data.ai_summary);
              setShowAnalysis(true);
          }

          // 1Hz Logic: Increment time by 1.0s every call
          timeRef.current += 1.0; 
          const idealAngle = Math.sin(timeRef.current * IDEAL_FREQ) * 60;
          const timestamp = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
          
          setSensorData(prev => {
            const newData = [...prev, { 
              time: timestamp, 
              angle: data.wrist_angle || 0, 
              ideal: idealAngle 
            }];
            return newData.slice(-MAX_DATA_POINTS);
          });

          setHrHistory(prev => {
            const newData = [...prev, { time: prev.length + 1, bpm: data.heart_rate || 0 }];
            return newData.slice(-40);
          });
        }
      } catch (error) {
        if (isMounted) {
          setConnectionStatus('error');
        }
      }
    };

    fetchData();
    // CHANGED TO 1000ms (1Hz) strictly
    intervalRef.current = setInterval(fetchData, 1000);
    
    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isProcessing, isSessionActive, showAnalysis]); 

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const themeColors = {
    grid: isDarkMode ? '#1e293b' : '#f1f5f9',
    text: isDarkMode ? '#94a3b8' : '#64748b',
    tooltipBg: isDarkMode ? '#0f172a' : '#ffffff',
    tooltipBorder: isDarkMode ? '#1e293b' : '#e2e8f0',
    hrGrid: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : '#f1f5f9'
  };

  return (
    <div className={`rehab-ai-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <style>{`
        /* CSS Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100vw; max-width: 100vw; overflow-x: hidden; margin: 0; padding: 0; }
        :root {
          --medical-blue: #2563eb;
          --success: #10b981;
          --success-dark: #059669;
          --danger: #ef4444;
          --target-red: #ef4444;
        }
        .light-theme {
          --medical-bg: #f8fafc;
          --card-bg: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-light: #f1f5f9;
          --hospital-white: #ffffff;
          --shadow-deep: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
          --monitor-shadow: inset 0 12px 24px rgba(15, 23, 42, 0.06), inset 0 2px 4px rgba(15, 23, 42, 0.03);
        }
        .dark-theme {
          --medical-bg: #020617;
          --card-bg: #0f172a;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --border-light: #1e293b;
          --hospital-white: #020617;
          --shadow-deep: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          --monitor-shadow: inset 0 10px 20px rgba(0, 0, 0, 0.5);
        }
        .rehab-ai-container {
          min-height: 100vh;
          width: 100vw;
          max-width: 100vw;
          background-color: var(--medical-bg);
          color: var(--text-main);
          font-family: 'Inter', sans-serif;
          padding: 2rem;
          transition: background-color 0.4s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }
        body { overflow-x: hidden !important; }
        .rehab-ai-container > * { width: 100% !important; }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: auto auto auto;
          gap: 2rem;
          width: 100%;
          max-width: 1300px;
          flex: 1;
        }
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--card-bg);
          padding: 1rem 2rem;
          border-radius: 1.25rem;
          border: 1px solid var(--border-light);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          margin-bottom: 2rem;
          width: 100%;
          max-width: 1300px;
          box-sizing: border-box;
        }
        .brand h1 { font-size: 1.3rem; font-weight: 800; color: var(--medical-blue); margin: 0; letter-spacing: -0.02em; }
        .theme-toggle {
          background: var(--border-light);
          border: none;
          padding: 0.6rem;
          border-radius: 0.75rem;
          color: var(--text-main);
          cursor: pointer;
          margin-right: 1.5rem;
          display: flex;
          align-items: center;
        }
        .sys-status {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
        }
        .status-active { color: var(--success-dark); background: rgba(16, 185, 129, 0.1); }
        .status-error { color: var(--danger); background: rgba(239, 68, 68, 0.1); }
        .monitor-card {
          background: var(--card-bg);
          border: 1px solid var(--border-light);
          border-radius: 2rem;
          padding: 2.2rem;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-deep);
          height: 560px;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }
        .session-control-card {
          border-radius: 2rem;
          padding: 0 4rem;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-deep);
          height: 180px;
          grid-column: span 2;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          cursor: pointer;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          outline: none;
        }
        .session-control-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .session-control-card:active { transform: translateY(1px); }
        .session-control-card:disabled { opacity: 0.7; cursor: wait; }
        .bpm-display { 
          display: flex; 
          flex-direction: row; 
          align-items: baseline;
          gap: 1.2rem;
          padding: 0.8rem 1.8rem;
          background: var(--hospital-white);
          border: 2px solid ${isDarkMode ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.1)'};
          border-radius: 1.25rem;
          box-shadow: var(--monitor-shadow);
          width: fit-content;
          margin-bottom: 1.5rem;
        }
        .bpm-val { font-size: 3.5rem; font-weight: 800; color: var(--text-main); line-height: 1; letter-spacing: -0.05em; }
        .bpm-label { font-size: 1rem; font-weight: 800; color: var(--text-muted); text-transform: 'uppercase'; letter-spacing: 0.1em; }
        .chart-recessed {
          flex: 1;
          background: var(--hospital-white);
          border-radius: 1.5rem;
          padding: 1.5rem 1rem 1rem 1rem;
          position: relative;
          overflow: hidden;
          box-shadow: var(--monitor-shadow);
          border: 1px solid var(--border-light);
        }
        .scan-line {
          position: absolute;
          inset: 0;
          width: 140px;
          background: linear-gradient(to right, transparent, rgba(37, 99, 235, 0.05), transparent);
          pointer-events: none;
          animation: scan 4s linear infinite;
          z-index: 1;
        }
        @keyframes scan { from { transform: translateX(-150%); } to { transform: translateX(500%); } }
        .card-loader {
          position: absolute;
          inset: 0;
          background: var(--card-bg);
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 2rem;
          opacity: 0.96;
        }
        .neural-card {
          grid-column: span 2;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: white;
          padding: 2rem 3rem;
          margin-top: 1rem;
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          gap: 2.5rem;
          box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.4);
          min-height: 130px;
          /* Animation for appearing */
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .skeleton-bar {
          height: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          animation: pulse 2s infinite ease-in-out;
          margin: 6px 0;
        }
        @keyframes pulse { 
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .session-control-card { grid-column: span 1; height: auto; min-height: 140px; padding: 2rem; }
          .neural-card { grid-column: span 1; }
        }
      `}</style>

      <nav className="navbar">
        <div className="brand">
          <h1>Rehab<span>AI</span> <small style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>Smart Wrist Assistant AI</small></h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={`sys-status ${connectionStatus === 'active' ? 'status-active' : 'status-error'}`}>
            {connectionStatus === 'active' ? <Wifi size={14} strokeWidth={3} /> : <AlertCircle size={14} />}
            {connectionStatus === 'active' ? 'CONNECTED' : 'RECONNECTING'}
          </div>
        </div>
      </nav>

      <main className="dashboard-grid">
        {/* Session Control */}
        <button 
          className="session-control-card"
          onClick={toggleSession}
          disabled={isProcessing}
          style={{
            background: isSessionActive
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : isDarkMode
                ? 'linear-gradient(135deg, var(--medical-blue) 0%, #1d4ed8 100%)'
                : 'linear-gradient(135deg, var(--medical-blue) 0%, #3b82f6 100%)',
          }}
        >
          <div>
            <h2 style={{ 
              fontSize: '1.4rem', 
              fontWeight: 800, 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '0.5rem',
              margin: 0
            }}>
              <Zap size={28} fill="white" className="text-yellow-400" />
              SESSION CONTROL
            </h2>
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: 'rgba(255,255,255,0.9)', 
              background: 'rgba(255,255,255,0.2)', 
              padding: '0.35rem 0.75rem', 
              borderRadius: '0.5rem', 
              display: 'inline-block',
              marginTop: '0.5rem'
            }}>
              {isProcessing 
                ? '● PROCESSING DATA...' 
                : (isSessionActive ? `● RECORDING: ${formatTime(seconds)}` : '● READY TO START')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'white' }}>
             <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>ACTION</div>
               <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                 {isProcessing ? 'WAIT' : (isSessionActive ? 'STOP' : 'START')}
               </div>
             </div>
             
             <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)'
             }}>
                {isProcessing ? (
                   <Loader2 size={28} className="animate-spin" color="white" />
                ) : (
                   isSessionActive ? <Square size={28} fill="white" /> : <Play size={28} fill="white" style={{ marginLeft: '4px' }} />
                )}
             </div>
          </div>
        </button>

        {/* Wrist Angle */}
        <section className="monitor-card">
          {connectionStatus !== 'active' && (
            <div className="card-loader">
              <Loader2 className="animate-spin" size={40} color="var(--medical-blue)" />
              <p style={{ marginTop: '1rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Synchronizing Motion Connection...</p>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={22} className="text-blue-600" />
              Wrist Angle
            </h2>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--medical-blue)', background: isDarkMode ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff', padding: '0.5rem 1rem', borderRadius: '0.6rem' }}>
              RANGE: 90° TO -90°
            </div>
          </div>

          <div className="chart-recessed">
            <div className="scan-line" />
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sensorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="angleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={themeColors.grid} />
                <XAxis dataKey="time" hide />
                <YAxis domain={[-90, 90]} ticks={[-90, -45, 0, 45, 90]} fontSize={11} fontWeight={700} stroke={themeColors.text} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, color: isDarkMode ? 'white' : 'black' }} />
                
                <Area type="monotone" dataKey="angle" fill="url(#angleGradient)" stroke="none" isAnimationActive={false} />
                <Line type="monotone" dataKey="angle" stroke="var(--medical-blue)" strokeWidth={5} dot={false} name="Patient" isAnimationActive={false} />
                <Line type="monotone" dataKey="ideal" stroke="var(--target-red)" strokeWidth={3} strokeDasharray="12 8" dot={false} name="Target" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 16, height: 6, borderRadius: '2px', background: 'var(--medical-blue)' }} /> Patient Path</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 16, height: 6, borderTop: '2.5px dashed var(--target-red)' }} /> Target Path</span>
          </div>
        </section>

        {/* Heart Rate */}
        <section className="monitor-card">
          {connectionStatus !== 'active' && (
            <div className="card-loader">
              <Loader2 className="animate-spin" size={40} color="var(--medical-blue)" />
              <p style={{ marginTop: '1.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Synchronizing Heart Rate Pulse Connection...</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Heart size={22} className="text-red-500" />
              Heart Rate
            </h2>
            <div style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '0.6rem', 
              background: riskLevel.includes('Danger') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: riskLevel.includes('Danger') ? 'var(--danger)' : 'var(--success-dark)',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}>
              {riskLevel.toUpperCase()}
            </div>
          </div>

          <div className="bpm-display">
            <span className="bpm-val">{heartRate || "--"}</span>
            <span className="bpm-label">BPM</span>
          </div>

          <div className="chart-recessed">
            <div className="scan-line" />
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hrHistory} margin={{ top: 10, bottom: 25, left: 10, right: 10 }}>
                <CartesianGrid stroke={themeColors.hrGrid} strokeDasharray="3 3" vertical={true} horizontal={true} />
                <YAxis domain={['dataMin 0', 'dataMax + 200']} axisLine={false} tickLine={false} fontSize={10} fontWeight={700} stroke={themeColors.text}>
                  <Label value="BEATS" angle={-90} position="insideLeft" style={{ fill: themeColors.text, fontSize: '9px', fontWeight: 800 }} offset={-5} />
                </YAxis>
                <XAxis dataKey="time" hide={false} axisLine={false} tickLine={false} fontSize={0}>
                  <Label value="PER MINUTE" position="insideBottom" style={{ fill: themeColors.text, fontSize: '9px', fontWeight: 800 }} offset={-15} />
                </XAxis>
                <Line 
                  type="monotone" 
                  dataKey="bpm" 
                  stroke={riskLevel.includes('Danger') ? 'var(--danger)' : 'var(--success-dark)'} 
                  strokeWidth={4.5} 
                  dot={false} 
                  animationDuration={300} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Neural Analysis Footer */}
        {showAnalysis && (
          <>
            <footer className="neural-card">
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '1.25rem', borderRadius: '1.25rem', height: 'fit-content' }}>
                  <BrainCircuit size={36} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '10px', letterSpacing: '0.2em' }}>
                    Gemma3:1b Neural Analysis Engine 
                  </span>
                  {aiConclusion ? (
                    <p style={{ fontSize: '1.15rem', lineHeight: '1.6', color: '#f8fafc', fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>{aiConclusion}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <div className="skeleton-bar" style={{ width: '90%' }} />
                      <div className="skeleton-bar" style={{ width: '60%' }} />
                    </div>
                  )}
                </div>
              </div>
            </footer>
            
            {/* NEW: Exercise Overview Component attached at the bottom */}
            <div style={{ gridColumn: 'span 2' }}>
               <ExerciseOverview backendUrl={BACKEND_URL} refreshTrigger={refreshOverviewToken} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;