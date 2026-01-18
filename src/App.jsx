import React, { useState, useEffect, useMemo } from 'react';
import { Check, Calendar as CalendarIcon, Edit3, Save, Trash2, Plus, X } from 'lucide-react';

// --- CONFIGURATION ---
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";

const INITIAL_WEEKLY_PLAN = {
  Monday: { title: "Chest Day", items: [
    { id: 'm1', name: "Chest Press", target: "3 sets x 10-12 reps" },
    { id: 'm2', name: "Iso-Lat Incline Press", target: "3 sets x 12 reps" },
    { id: 'm3', name: "Pec Fly", target: "3 sets x 12-15 reps" },
    { id: 'm4', name: "Triceps Pushdown", target: "3 sets x 12-15 reps" },
    { id: 'm5', name: "Seat Dip", target: "3 sets x Failure" },
  ]},
  Tuesday: { title: "Back Day", items: [
    { id: 't1', name: "Lat Pulldown", target: "3 sets x 10-12 reps" },
    { id: 't2', name: "Seated Row", target: "3 sets x 12 reps" },
    { id: 't3', name: "Face Pull", target: "3 sets x 15 reps" },
    { id: 't4', name: "DB Bicep Curl", target: "3 sets x 12 reps" },
  ]},
  Wednesday: { title: "Active Rest", items: [
    { id: 'w1', name: "Jogging / Run", target: "Target: 3KM", type: 'cardio' }
  ]},
  Thursday: { title: "Shoulder Day", items: [
    { id: 'th1', name: "Shoulder Press Mach.", target: "3 sets x 10-12 reps" },
    { id: 'th2', name: "DB Lateral Raise", target: "4 sets x 15 reps" },
    { id: 'th3', name: "Rear Delt Fly", target: "3 sets x 15 reps" },
    { id: 'th4', name: "Goblet Squat", target: "3 sets x 12 reps" },
  ]},
  Friday: { title: "Cardio", items: [
    { id: 'f1', name: "Long Run", target: "Target: 6KM", type: 'cardio' }
  ]},
  Saturday: { title: "Cardio", items: [
    { id: 's1', name: "Long Run", target: "Target: 6KM", type: 'cardio' }
  ]},
  Sunday: { title: "Rest Day", items: [
    { id: 'su1', name: "Full Rest", target: "Sleep & Recover" }
  ]}
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVIATIONS = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

const getStorageKey = (key) => `training_v2_${key}`;
const getLocalISODate = (dateObj) => {
  const offset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
};

export default function App() {
  const [planData, setPlanData] = useState(INITIAL_WEEKLY_PLAN);
  const [completedItems, setCompletedItems] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [displayDate, setDisplayDate] = useState("");
  const [realDayName, setRealDayName] = useState("");
  const [viewDayName, setViewDayName] = useState("Monday");
  const [history, setHistory] = useState({}); 
  const [todayKm, setTodayKm] = useState({}); 
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // 初始化
  useEffect(() => {
    const todayObj = new Date();
    const dayName = todayObj.toLocaleDateString('en-US', { weekday: 'long' });
    const fullDate = todayObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dateKey = getLocalISODate(todayObj);
    
    setDisplayDate(fullDate);
    setRealDayName(dayName);
    setViewDayName(dayName);
    
    const savedPlan = localStorage.getItem(getStorageKey('plan'));
    if(savedPlan) setPlanData(JSON.parse(savedPlan));
    
    setHistory(JSON.parse(localStorage.getItem(getStorageKey('history'))) || {});

    const lastDate = localStorage.getItem(getStorageKey('lastDate'));
    if (lastDate === dateKey) {
      setCompletedItems(JSON.parse(localStorage.getItem(getStorageKey('completedItems')) || '[]'));
      setIsFinished(JSON.parse(localStorage.getItem(getStorageKey('isFinished')) || 'false'));
      setTodayKm(JSON.parse(localStorage.getItem(getStorageKey('todayKm')) || '{}'));
    } else {
      localStorage.setItem(getStorageKey('lastDate'), dateKey);
    }
  }, []);

  // 儲存邏輯
  useEffect(() => { localStorage.setItem(getStorageKey('plan'), JSON.stringify(planData)); }, [planData]);
  
  useEffect(() => {
    if (realDayName && viewDayName === realDayName) {
      localStorage.setItem(getStorageKey('completedItems'), JSON.stringify(completedItems));
      localStorage.setItem(getStorageKey('isFinished'), JSON.stringify(isFinished));
      localStorage.setItem(getStorageKey('todayKm'), JSON.stringify(todayKm));
      
      const dateKey = getLocalISODate(new Date());
      const totalKm = Object.values(todayKm).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
      
      // 更新歷史紀錄
      setHistory(prev => {
        const newEntry = { finished: isFinished, km: totalKm };
        // 簡單的比對避免無限迴圈
        if (prev[dateKey] && prev[dateKey].finished === isFinished && prev[dateKey].km === totalKm) return prev;
        
        const updated = { ...prev, [dateKey]: newEntry };
        localStorage.setItem(getStorageKey('history'), JSON.stringify(updated));
        return updated;
      });
    }
  }, [completedItems, isFinished, todayKm, realDayName, viewDayName]);

  const toggleItem = (id) => {
    if (!isEditing && viewDayName !== realDayName) return; // 只允許編輯當天或在編輯模式下
    setCompletedItems(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const updateExercise = (id, field, value) => {
    const currentPlan = planData[viewDayName];
    const newItems = currentPlan.items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setPlanData({
      ...planData,
      [viewDayName]: { ...currentPlan, items: newItems }
    });
  };

  const currentPlan = planData[viewDayName] || planData.Monday;
  const isToday = viewDayName === realDayName;
  const progress = currentPlan.items.length === 0 ? 100 : Math.round((currentPlan.items.filter(i => completedItems.includes(i.id)).length / currentPlan.items.length) * 100);

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-serif text-white bg-black">
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`body { font-family: 'ITC Benguiat', 'Libre Baskerville', serif; }`}</style>

      {/* --- 背景極光效果 --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-blue-900/20 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-red-900/20 blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col p-6">
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-6 pt-4">
           <button onClick={() => setShowCalendar(true)} className="p-3 bg-white/5 rounded-full backdrop-blur-md border border-white/10 active:scale-95 transition-all">
             <CalendarIcon size={20} className="text-white/80" />
           </button>
           <button onClick={() => setIsEditing(!isEditing)} className={`p-3 rounded-full backdrop-blur-md border transition-all ${isEditing ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10'}`}>
             {isEditing ? <Save size={20} /> : <Edit3 size={20}/>}
           </button>
        </div>

        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            {isToday ? displayDate : viewDayName}
          </h1>
          <div className="text-sm text-white/40 mb-6 uppercase tracking-widest font-bold">
             {currentPlan.title}
          </div>

          {/* 星期切換器 */}
          <div className="flex justify-between bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
            {DAYS_ORDER.map(d => (
              <button key={d} onClick={() => setViewDayName(d)} className={`w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${viewDayName === d ? 'bg-white text-black shadow-lg scale-110' : 'text-white/40 hover:bg-white/5'}`}>
                {DAY_ABBREVIATIONS[d]}
              </button>
            ))}
          </div>
        </header>

        {/* PROGRESS BAR */}
        {!isEditing && (
          <div className="mb-8 relative h-32 p-6 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden flex items-end shadow-2xl">
            <div className="absolute top-0 bottom-0 left-0 bg-blue-500/30 transition-all duration-1000 ease-out blur-3xl" style={{ width: `${progress}%` }}></div>
            <div className="relative z-10 w-full">
              <div className="text-5xl font-bold mb-1">{progress}%</div>
              <div className="text-white/40 text-xs tracking-[0.2em] uppercase">Daily Completion</div>
            </div>
            {/* 視覺裝飾線 */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          </div>
        )}

        {/* EXERCISE LIST */}
        <div className="flex-1 space-y-4 mb-20">
          {currentPlan.items.map(item => {
            const isDone = completedItems.includes(item.id);
            return (
              <div key={item.id} 
                onClick={() => toggleItem(item.id)}
                className={`group relative p-5 rounded-[24px] border transition-all duration-300 backdrop-blur-xl cursor-pointer overflow-hidden
                  ${isDone ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 active:scale-[0.98] hover:bg-white/10'}
                `}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex-1 mr-4">
                    {isEditing ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <input className="w-full bg-white/10 p-2 rounded-lg text-white border border-white/10 focus:border-blue-500 outline-none" 
                          value={item.name} 
                          onChange={e => updateExercise(item.id, 'name', e.target.value)} 
                        />
                        <input className="w-full bg-white/5 p-2 rounded-lg text-white/60 text-sm border border-transparent focus:border-white/20 outline-none" 
                          value={item.target} 
                          onChange={e => updateExercise(item.id, 'target', e.target.value)} 
                        />
                      </div>
                    ) : (
                      <>
                        <div className={`font-semibold text-lg mb-1 transition-colors ${isDone ? 'text-green-200 line-through decoration-green-500/50' : 'text-white'}`}>
                          {item.name}
                        </div>
                        <div className={`text-sm tracking-wide ${isDone ? 'text-green-200/50' : 'text-white/40'}`}>
                          {item.target}
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500
                      ${isDone ? 'bg-green-500 border-green-400 text-black rotate-0' : 'border-white/20 text-transparent rotate-90'}
                    `}>
                      <Check size={16} strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CALENDAR MODAL */}
        {showCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#111] border border-white/10 rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setShowCalendar(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white">
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-bold mb-6 text-center tracking-widest">RECORD</h2>
              
              {/* 簡單的歷史記錄列表 */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {Object.keys(history).length === 0 ? (
                   <div className="text-center text-white/30 py-10">No records yet.</div>
                ) : (
                  Object.entries(history).sort((a,b) => b[0].localeCompare(a[0])).map(([date, data]) => (
                    <div key={date} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-white/80">{date}</div>
                      <div className="flex items-center gap-3">
                         {data.km > 0 && <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">{data.km}KM</span>}
                         {data.finished && <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">DONE</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}