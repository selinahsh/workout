import React, { useState, useEffect, useMemo } from 'react';
import { Check, Calendar as CalendarIcon, Edit3, Save, X, ChevronLeft, ChevronRight, Trophy, Activity, Dumbbell, MapPin } from 'lucide-react';

// --- CONFIGURATION ---
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";

// 基礎課表
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
const WEEK_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const getStorageKey = (key) => `gym_app_v5_${key}`; // 升級版本號
const getLocalISODate = (dateObj) => {
  const offset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
};

export default function App() {
  // --- 狀態管理 ---
  const [planData, setPlanData] = useState(INITIAL_WEEKLY_PLAN);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [calendarNavDate, setCalendarNavDate] = useState(new Date());
  
  // 該日期的狀態
  const [completedItems, setCompletedItems] = useState([]);
  const [isDayFinished, setIsDayFinished] = useState(false);
  const [todayKm, setTodayKm] = useState(""); // 新增：今日公里數輸入 (字串方便輸入小數點)

  // 歷史大數據: { '2026-01-22': { doneItems: [], isFinished: true, type: 'gym', km: 5.2 } }
  const [history, setHistory] = useState({}); 
  
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // --- 計算屬性 ---
  const viewDateString = getLocalISODate(viewDate);
  const todayString = getLocalISODate(new Date());
  const viewDayName = viewDate.toLocaleDateString('en-US', { weekday: 'long' });
  const displayDateTitle = viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const currentPlan = planData[viewDayName] || planData.Monday;

  // 判斷當天類型
  const isCardioDay = useMemo(() => {
    const title = currentPlan.title.toLowerCase();
    return title.includes("cardio") || title.includes("run") || title.includes("active");
  }, [currentPlan]);

  // --- 初始化與載入 ---
  useEffect(() => {
    const savedPlan = localStorage.getItem(getStorageKey('plan'));
    if(savedPlan) setPlanData(JSON.parse(savedPlan));
    
    const savedHistory = localStorage.getItem(getStorageKey('history'));
    if(savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // --- 切換日期時載入數據 ---
  useEffect(() => {
    const record = history[viewDateString];
    if (record) {
      setCompletedItems(record.doneItems || []);
      setIsDayFinished(record.isFinished || false);
      setTodayKm(record.km ? record.km.toString() : ""); // 載入公里數
    } else {
      setCompletedItems([]);
      setIsDayFinished(false);
      setTodayKm("");
    }
  }, [viewDateString, history]);

  // --- 核心儲存邏輯 ---
  const updateHistory = (newCompletedItems, newIsFinished, newKm) => {
    setCompletedItems(newCompletedItems);
    setIsDayFinished(newIsFinished);
    setTodayKm(newKm);

    // 確保公里數轉為數字儲存
    const kmValue = parseFloat(newKm); 

    const newEntry = {
      doneItems: newCompletedItems,
      isFinished: newIsFinished,
      type: isCardioDay ? 'cardio' : 'gym',
      km: isNaN(kmValue) ? 0 : kmValue, // 存入數字
      lastUpdated: new Date().toISOString()
    };

    const newHistory = { ...history, [viewDateString]: newEntry };
    setHistory(newHistory);
    localStorage.setItem(getStorageKey('history'), JSON.stringify(newHistory));
  };

  // 處理公里數輸入
  const handleKmChange = (val) => {
    setTodayKm(val);
    // 即時存檔，但不改變完成狀態
    updateHistory(completedItems, isDayFinished, val);
  };

  const toggleItem = (id) => {
    if (!isEditing) {
      const newItems = completedItems.includes(id)
        ? completedItems.filter(item => item !== id)
        : [...completedItems, id];
      updateHistory(newItems, isDayFinished, todayKm);
    }
  };

  const toggleDayFinish = () => {
    const newStatus = !isDayFinished;
    updateHistory(completedItems, newStatus, todayKm);
  };

  const updateExercise = (id, field, value) => {
    const currentItems = planData[viewDayName].items;
    const newItems = currentItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    const newPlan = { ...planData, [viewDayName]: { ...planData[viewDayName], items: newItems } };
    setPlanData(newPlan);
    localStorage.setItem(getStorageKey('plan'), JSON.stringify(newPlan));
  };

  const progress = currentPlan.items.length === 0 ? 100 : Math.round((completedItems.length / currentPlan.items.length) * 100);

  // --- 月曆統計邏輯 (修改重點) ---
  const getMonthStats = () => {
    let gymDays = 0;
    let totalKm = 0; // 改為計算總里程
    const currentYear = calendarNavDate.getFullYear();
    const currentMonth = calendarNavDate.getMonth();

    Object.keys(history).forEach(dateStr => {
      const d = new Date(dateStr);
      const record = history[dateStr];
      
      // 確保是這個月份
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        if (record.isFinished) {
          // 只有按了完成才算天數
          if (record.type !== 'cardio') gymDays++;
        }
        // 只要有輸入里程就加總 (不一定要按完成，但通常會按)
        if (record.type === 'cardio' && record.km) {
          totalKm += record.km;
        }
      }
    });
    // 取小數點後一位
    return { gymDays, totalKm: parseFloat(totalKm.toFixed(1)) };
  };
  
  const monthStats = useMemo(getMonthStats, [history, calendarNavDate]);

  // --- 月曆渲染輔助 ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; 
    return { days, startOffset: adjustedFirstDay };
  };
  const { days: totalDays, startOffset } = getDaysInMonth(calendarNavDate);
  const calendarTitle = calendarNavDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const changeMonth = (offset) => {
    setCalendarNavDate(new Date(calendarNavDate.getFullYear(), calendarNavDate.getMonth() + offset, 1));
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-serif text-white bg-black selection:bg-blue-500/30">
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`body { font-family: 'ITC Benguiat', 'Libre Baskerville', serif; }`}</style>

      {/* 背景特效 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-blue-900/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-red-900/10 blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col p-6">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-6 pt-4">
           <button onClick={() => { setShowCalendar(true); setCalendarNavDate(viewDate); }} className="p-3 bg-white/5 rounded-full backdrop-blur-md border border-white/10 active:scale-95 transition-all group hover:bg-white/10">
             <CalendarIcon size={20} className="text-white/80 group-hover:text-white" />
           </button>
           
           {viewDateString !== todayString && (
             <button onClick={() => setViewDate(new Date())} className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs font-bold text-blue-200 backdrop-blur-md">
               BACK TO TODAY
             </button>
           )}

           <button onClick={() => setIsEditing(!isEditing)} className={`p-3 rounded-full backdrop-blur-md border transition-all ${isEditing ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10'}`}>
             {isEditing ? <Save size={20} /> : <Edit3 size={20}/>}
           </button>
        </div>

        {/* HEADER */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2 tracking-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            {displayDateTitle}
          </h1>
          <div className="text-sm text-white/40 mb-6 uppercase tracking-widest font-bold flex items-center gap-2">
             <span className={`w-1.5 h-1.5 rounded-full ${isCardioDay ? 'bg-blue-500' : 'bg-red-500'}`}></span>
             {currentPlan.title}
          </div>

          {/* KM 輸入框 (僅在跑步日顯示) */}
          {isCardioDay && !isEditing && (
            <div className="mb-6 p-5 bg-blue-900/10 border border-blue-500/20 rounded-[24px] backdrop-blur-md relative overflow-hidden">
               <div className="absolute -right-5 -top-5 text-blue-500/10 rotate-12">
                 <MapPin size={100} />
               </div>
               <label className="text-blue-300 text-[10px] font-bold tracking-widest uppercase mb-1 block">Distance Run</label>
               <div className="flex items-end gap-2 relative z-10">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={todayKm}
                    onChange={(e) => handleKmChange(e.target.value)}
                    className="bg-transparent text-5xl font-bold text-white outline-none w-40 border-b border-blue-500/50 focus:border-blue-400 placeholder-white/10 font-sans"
                    placeholder="0.0"
                  />
                  <span className="text-lg text-blue-400 font-bold mb-3 tracking-widest">KM</span>
               </div>
            </div>
          )}

          <div className="flex justify-between bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
            {DAYS_ORDER.map((d) => (
              <div key={d} className={`w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${viewDayName === d ? 'bg-white text-black shadow-lg scale-110' : 'text-white/20'}`}>
                {DAY_ABBREVIATIONS[d]}
              </div>
            ))}
          </div>
        </header>

        {/* PROGRESS BAR (僅在非跑步日或編輯模式顯示，因為跑步日有大輸入框了) */}
        {!isEditing && !isCardioDay && (
          <div className="mb-6 relative h-24 p-6 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl border border-white/10 rounded-[24px] overflow-hidden flex items-end shadow-2xl">
            <div className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out blur-3xl ${isDayFinished ? 'bg-green-500/40 w-full' : 'bg-red-500/20'}`} style={{ width: isDayFinished ? '100%' : `${progress}%` }}></div>
            <div className="relative z-10 w-full flex justify-between items-end">
              <div>
                <div className="text-4xl font-bold mb-1">{isDayFinished ? "DONE" : `${progress}%`}</div>
                <div className="text-white/40 text-[10px] tracking-[0.2em] uppercase">Daily Progress</div>
              </div>
              {isDayFinished && <Trophy className="text-yellow-400 mb-2" size={32} />}
            </div>
          </div>
        )}

        {/* EXERCISE LIST */}
        <div className="flex-1 space-y-4 mb-24">
          {currentPlan.items.length === 0 ? (
             <div className="text-center text-white/30 py-10 italic">No exercises planned.</div>
          ) : (
            currentPlan.items.map(item => {
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
            })
          )}

          {/* FINISH BUTTON */}
          {!isEditing && currentPlan.items.length > 0 && (
             <button 
               onClick={toggleDayFinish}
               className={`w-full py-5 rounded-[24px] font-bold tracking-widest text-lg transition-all duration-500 border backdrop-blur-xl shadow-2xl flex items-center justify-center gap-3
                 ${isDayFinished 
                   ? 'bg-green-600/20 border-green-500 text-green-400' 
                   : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40 hover:text-white'}
               `}
             >
               {isDayFinished ? (
                 <> <Trophy size={20} /> COMPLETED </>
               ) : (
                 "COMPLETE WORKOUT"
               )}
             </button>
          )}
        </div>

        {/* --- CALENDAR MODAL --- */}
        {showCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
              
              {/* Close Button (Left) */}
              <button onClick={() => setShowCalendar(false)} className="absolute top-5 left-5 p-2 text-white/40 hover:text-white transition-colors z-20">
                <X size={24} />
              </button>
              
              {/* Monthly Stats (修改：右邊改為 Total KM) */}
              <div className="mt-10 mb-6 flex justify-around border-b border-white/10 pb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-red-400 mb-1">
                    <Dumbbell size={16} /> <span className="text-xs font-bold tracking-widest">GYM</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{monthStats.gymDays}</div>
                  <div className="text-[10px] text-white/30 uppercase">Days</div>
                </div>
                <div className="w-px bg-white/10"></div>
                <div className="text-center">
                   <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                    <Activity size={16} /> <span className="text-xs font-bold tracking-widest">RUN</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{monthStats.totalKm}</div>
                  <div className="text-[10px] text-white/30 uppercase">Total KM</div>
                </div>
              </div>

              {/* Calendar Controls */}
              <div className="flex items-center justify-between mb-4 px-2 mt-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-lg font-bold tracking-widest text-white">{calendarTitle}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-7 mb-2 text-center">
                {WEEK_HEADERS.map(day => (
                  <div key={day} className="text-[10px] font-bold text-white/30 uppercase">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}

                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const cellDate = new Date(calendarNavDate.getFullYear(), calendarNavDate.getMonth(), day);
                  const cellDateStr = getLocalISODate(cellDate);
                  
                  const isToday = cellDateStr === todayString;
                  const isSelected = cellDateStr === viewDateString;
                  const historyData = history[cellDateStr];
                  const isFinished = historyData?.isFinished;
                  const type = historyData?.type;
                  const hasKm = historyData?.km > 0;
                  
                  return (
                    <button 
                      key={day} 
                      onClick={() => { setViewDate(cellDate); setShowCalendar(false); }}
                      className={`
                        relative h-9 w-9 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all
                        ${isSelected ? 'bg-white text-black shadow-lg scale-110 z-10' : 'text-white/60 hover:bg-white/10'}
                        ${isToday && !isSelected ? 'border border-white/20 text-white' : ''}
                      `}
                    >
                      {day}
                      {/* Status Indicators */}
                      {(isFinished || hasKm) && (
                        <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${type === 'cardio' ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'}`}></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}