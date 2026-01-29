import logging
import requests
import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, DateTime, ForeignKey, func, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# --- Configuration ---
# UPDATE THIS LINE with your actual MySQL root password if different
DATABASE_URL = "mysql+pymysql://root@localhost/rehab_ai_db"

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Database Setup ---
try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
except Exception as e:
    logger.error(f"Database Connection Error: {e}")
    # Fallback for running without DB (prevents crash)
    engine = None
    SessionLocal = None
    Base = declarative_base()

# --- SQLAlchemy Models ---
class SessionDB(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    avg_heart_rate = Column(Integer, default=0)
    avg_wrist_angle = Column(Float, default=0.0)
    accuracy_score = Column(Float, default=0.0) # 0-100%
    risk_level = Column(String(50))
    ai_conclusion = Column(Text)
    exercise_tip = Column(Text)
    
    readings = relationship("SensorReadingDB", back_populates="session")

class SensorReadingDB(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    wrist_angle = Column(Float)
    heart_rate = Column(Integer)
    
    session = relationship("SessionDB", back_populates="readings")

# Create tables if engine exists
if engine:
    Base.metadata.create_all(bind=engine)

# --- FastAPI App ---
app = FastAPI(title="Rehab AI Monitor (MySQL Edition)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class SensorData(BaseModel):
    heart_rate: int
    wrist_angle: float

# --- Global State (In-Memory Buffer) ---
is_recording = False
session_start_time = None
buffer_data = [] # List of dicts: {'hr': int, 'angle': float, 'time': datetime}

current_status = {
    "heart_rate": 0,
    "wrist_angle": 0,
    "risk_level": "Idle",
    "ai_summary": "Ready to start session.",
    "is_recording": False
}

# --- Dependencies ---
def get_db():
    if SessionLocal is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helper Functions ---
def calculate_risk(hr: int, angle: float) -> str:
    if hr > 120 or hr < 40: return "High (Danger)"
    elif hr > 100 or angle > 45: return "Moderate (Caution)"
    return "Low (Safe)"

def get_gemma_analysis(avg_hr, avg_angle, context="single_session", history_summary=""):
    """
    Calls Ollama/Gemma. 
    context: 'single_session' or 'overview'
    """
    url = "http://localhost:11434/api/generate"
    
    if context == "single_session":
        prompt = (
            f"Context: Physical therapy analysis. "
            f"Data: Avg HR {avg_hr} bpm, Avg Angle {avg_angle} degrees. "
            f"Task: Provide 'Medical Conclusion' and one 'Exercise Tip'. "
            f"Format: "
            f"Medical Conclusion: [One sentence summary].\n\n"
            f"Exercise Tip: [One actionable tip].\n"
            f"No conversational filler."
        )
    else:
        prompt = (
            f"Context: Patient Progress Report over multiple sessions. "
            f"History: {history_summary} "
            f"Task: Analyze the history to identify positive trends and suggest one area for improvement. "
            f"Format: Provide a structured report in plain text. "
            f"Start with a brief conversational opening. "
            f"Strict Instructions: Do not use Markdown. Do not use bold text. Do not use asterisks. "
            f"Follow this exact structure:\n\n"
            f"Example Output:\n"
            f"Here is the summary of your recent progress.\n"
            f"Trend Analysis:\n"
            f"- Observation: Heart rate has stabilized.\n"
            f"- Trend: Consistency is improving.\n\n"
            f"Area for Improvement:\n"
            f"- Recommendation: Focus on wrist stability.\n\n"
            f"Now generate the report for the current data:"
        )

    try:
        payload = {
            "model": "gemma3:1b",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 300}
        }
        response = requests.post(url, json=payload, timeout=45)
        return response.json().get("response", "Analysis failed.").strip()
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return "Medical Conclusion: Data recorded.\n\nExercise Tip: Consult dashboard."

# --- API Endpoints ---

@app.post("/start-session")
def start_session():
    global is_recording, buffer_data, session_start_time, current_status
    
    is_recording = True
    buffer_data = []
    session_start_time = datetime.datetime.utcnow()
    
    current_status["is_recording"] = True
    current_status["ai_summary"] = "Recording..."
    current_status["risk_level"] = "Active"
    
    logger.info("SESSION STARTED - Buffer Cleared")
    return {"message": "Session started"}

@app.post("/stop-session")
def stop_session(db: Session = Depends(get_db)):
    global is_recording, buffer_data, session_start_time, current_status
    
    if not is_recording:
        return {"message": "Session was not active."}

    # 1. Stop Recording
    is_recording = False
    current_status["is_recording"] = False
    end_time = datetime.datetime.utcnow()
    duration = (end_time - session_start_time).seconds
    
    if not buffer_data:
        current_status["ai_summary"] = "No data recorded."
        return {"message": "No data recorded"}

    # 2. Process Buffer (Math)
    hrs = [d['hr'] for d in buffer_data]
    angles = [d['angle'] for d in buffer_data]
    
    avg_hr = int(sum(hrs) / len(hrs))
    avg_angle = round(sum(angles) / len(angles), 2)
    
    # Calculate simple accuracy (deviation from ideal 0-degree baseline for rehab)
    stability_score = max(0, 100 - (sum([abs(a) for a in angles]) / len(angles)))

    # 3. AI Analysis
    ai_text = get_gemma_analysis(avg_hr, avg_angle, context="single_session")
    
    # Parse AI response
    conclusion = "Analysis pending"
    tip = "Keep practicing"
    
    if "Medical Conclusion:" in ai_text:
        # Simple parsing logic
        try:
            parts = ai_text.split("Medical Conclusion:")[1].split("Exercise Tip:")
            conclusion = parts[0].strip()
            if len(parts) > 1:
                tip = parts[1].strip()
        except:
            conclusion = ai_text

    # 4. Write to MySQL
    new_session = SessionDB(
        start_time=session_start_time,
        end_time=end_time,
        duration_seconds=duration,
        avg_heart_rate=avg_hr,
        avg_wrist_angle=avg_angle,
        accuracy_score=round(stability_score, 1),
        risk_level=calculate_risk(avg_hr, avg_angle),
        ai_conclusion=conclusion,
        exercise_tip=tip
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Bulk insert raw readings
    readings_objects = [
        SensorReadingDB(
            session_id=new_session.id,
            timestamp=d['time'],
            wrist_angle=d['angle'],
            heart_rate=d['hr']
        ) for d in buffer_data
    ]
    db.bulk_save_objects(readings_objects)
    db.commit()
    
    logger.info(f"SAVED SESSION ID {new_session.id} to MySQL")
    
    current_status["ai_summary"] = ai_text
    
    return {
        "analysis": ai_text,
        "avg_hr": avg_hr,
        "avg_angle": avg_angle,
        "session_id": new_session.id
    }

@app.post("/update-sensors")
async def update_sensors(data: SensorData):
    global buffer_data, current_status
    
    # Always update live view
    current_status["heart_rate"] = data.heart_rate
    current_status["wrist_angle"] = data.wrist_angle
    if not current_status["is_recording"]:
         current_status["risk_level"] = calculate_risk(data.heart_rate, data.wrist_angle)

    # Only buffer if recording
    if is_recording:
        buffer_data.append({
            "hr": data.heart_rate,
            "angle": data.wrist_angle,
            "time": datetime.datetime.utcnow()
        })
        
    return {"status": "received"}

@app.get("/get-rehab-status")
async def get_status():
    return current_status

@app.get("/exercise-overview")
def get_exercise_overview(db: Session = Depends(get_db)):
    """
    Fetches history and generates a meta-analysis.
    """
    # Get last 5 sessions
    sessions = db.query(SessionDB).order_by(desc(SessionDB.start_time)).limit(5).all()
    
    if not sessions:
        return {"history": [], "ai_overview": "No sessions found."}
        
    # Format for AI
    history_summary = "; ".join([
        f"Session {s.id}: Avg HR {s.avg_heart_rate}, Accuracy {s.accuracy_score}%"
        for s in sessions
    ])
    
    # Generate Overview
    ai_overview = get_gemma_analysis(0, 0, context="overview", history_summary=history_summary)
    
    # Format for Frontend
    formatted_history = [{
        "id": s.id,
        "date": s.start_time.strftime("%Y-%m-%d %H:%M"),
        "hr": s.avg_heart_rate,
        "accuracy": s.accuracy_score,
        "risk": s.risk_level
    } for s in sessions]
    
    return {
        "history": formatted_history,
        "ai_overview": ai_overview
    }

if __name__ == "__main__":
    import uvicorn
    # Change host to 0.0.0.0
    uvicorn.run(app, host="0.0.0.0", port=8000)