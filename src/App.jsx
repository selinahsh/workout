import React, { useState, useEffect, useMemo } from 'react';
import { Check, Calendar as CalendarIcon, Edit3, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';

// --- CONFIGURATION ---
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";

// 基礎課表 (Template)
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

// Helper: 產生 localStorage Key
const getStorageKey = (key) => `gym_app_v3_${key}`;

// Helper: 處理時區問題，確保拿到當地的 YYYY-MM-DD
const getLocalISODate = (dateObj) => {
  const offset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
};

export default function App() {
  // --- 1. 核心狀態 ---
  const [planData, setPlanData] = useState(INITIAL_WEEKLY_PLAN);
  
  // viewDate: 當前主畫面正在查看的日期 (Date Object)
  const [viewDate, setViewDate] = useState(new Date()); 
  
  // 為了日曆導航用的狀態 (切換月份用，不影響主畫面)
  const [calendarNavDate, setCalendarNavDate] = useState(new Date());

  // 該日期的完成項目 ID 列表
  const [completedItems, setCompletedItems] = useState([]);
  
  // 歷史大數據: { '2026-01-22': { doneItems: ['m1'], km: 5 } }
  const [history, setHistory] = useState({}); 
  
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // --- 2. 計算屬性 (Derived State) ---
  const viewDateString = getLocalISODate(viewDate); // "2026-01-22"
  const todayString = getLocalISODate(new Date());
  
  // 取得查看日期的星期幾 (e.g., "Monday")
  const viewDayName = viewDate.toLocaleDateString('en-US', { weekday: 'long' });
  // 取得查看日期的顯示格式 (e.g., "Monday, Jan 22")
  const displayDateTitle = viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // 當天的計畫內容
  const currentPlan = planData[viewDayName] || planData.Monday;

  // --- 3. 初始化 (Load Data) ---
  useEffect(() => {
    // 載入課表設定
    const savedPlan = localStorage.getItem(getStorageKey('plan'));
    if(savedPlan) setPlanData(JSON.parse(savedPlan));
    
    // 載入歷史紀錄
    const savedHistory = localStorage.getItem(getStorageKey('history'));
    if(savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // --- 4. 當 viewDate 改變時，載入那一天的數據 ---
  useEffect(() => {
    // 如果歷史紀錄裡有這一天，就載入這一天完成的項目
    if (history[viewDateString]) {
      setCompletedItems(history[viewDateString].doneItems || []);
    } else {
      // 如果沒有紀錄，且是今天，保持空 (或是從暫存讀取，這裡簡化為空)
      // 如果是未來，也是空
      setCompletedItems([]);
    }
  }, [viewDateString, history]);

  // --- 5. 儲存邏輯 (Auto Save) ---
  const saveHistory = (newCompletedItems) => {
    setCompletedItems(newCompletedItems);
    
    // 計算今日跑步量 (這裡簡化：只要有打勾跑步項目，就算達成目標)
    // 如果你要精確輸入公里數，可以在這裡擴充
    let km = 0;
    const isCardioDay = currentPlan.title.includes("Cardio") || currentPlan.title.includes("Active");
    if (isCardioDay && newCompletedItems.length > 0) {
      // 簡單邏輯：如果有打勾任何項目，假設達成目標 (可從 planData 讀取 target 字串解析，這裡先設為 1 表示有運動)
      km = 1; 
    }

    const newEntry = {
      doneItems: newCompletedItems,
      km: km, 
      lastUpdated: new Date().toISOString()
    };

    const newHistory = {
      ...history,
      [viewDateString]: newEntry
    };

    setHistory(newHistory);
    localStorage.setItem(getStorageKey('history'), JSON.stringify(newHistory));
  };

  const toggleItem = (id) => {
    if (!isEditing) {
      const newItems = completedItems.includes(id)
        ? completedItems.filter(item => item !== id)
        : [...completedItems, id];
      saveHistory(newItems);
    }
  };

  const updateExercise = (id, field, value) => {
    const currentItems = planData[viewDayName].items;
    const newItems = currentItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    const newPlan = {
      ...planData,
      [viewDayName]: { ...planData[viewDayName], items: newItems }
    };
    setPlanData(newPlan);
    localStorage.setItem(getStorageKey('plan'), JSON.stringify(newPlan));
  };

  const progress = currentPlan.items.length === 0 ? 100 : Math.round((completedItems.length / currentPlan.items.length) * 100);

  // --- 6. 日曆邏輯 (Calendar Logic) ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
    // 調整為週一開始 (Mon=0, ..., Sun=6)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; 
    return { days, startOffset: adjustedFirstDay };
  };

  const { days: totalDays, startOffset } = getDaysInMonth(calendarNavDate);
  const calendarTitle = calendarNavDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleDateClick = (day) => {
    const newDate = new Date(calendarNavDate.getFullYear(), calendarNavDate.getMonth(), day);
    setViewDate(newDate); // 切換主畫面日期
    setShowCalendar(false); // 關閉日曆
  };

  const changeMonth = (offset) => {
    const newDate = new Date(calendarNavDate.getFullYear(), calendarNavDate.getMonth() + offset, 1);
    setCalendarNavDate(newDate);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-serif text-white bg-black selection:bg-blue-500/30">
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`body { font-family: 'ITC Benguiat', 'Libre Baskerville', serif; }`}</style>

      {/* --- 背景特效 --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-blue-900/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-red-900/10 blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col p-6">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-6 pt-4">
           {/* 日曆按鈕 */}
           <button onClick={() => { setShowCalendar(true); setCalendarNavDate(viewDate); }} className="p-3 bg-white/5 rounded-full backdrop-blur-md border border-white/10 active:scale-95 transition-all group hover:bg-white/10">
             <CalendarIcon size={20} className="text-white/80 group-hover:text-white" />
           </button>
           
           {/* 顯示今天按鈕 (如果不在今天的話) */}
           {viewDateString !== todayString && (
             <button onClick={() => setViewDate(new Date())} className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs font-bold text-blue-200 backdrop-blur-md">
               BACK TO TODAY
             </button>
           )}

           {/* 編輯按鈕 */}
           <button onClick={() => setIsEditing(!isEditing)} className={`p-3 rounded-full backdrop-blur-md border transition-all ${isEditing ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10'}`}>
             {isEditing ? <Save size={20} /> : <Edit3 size={20}/>}
           </button>
        </div>

        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            {displayDateTitle}
          </h1>
          <div className="text-sm text-white/40 mb-6 uppercase tracking-widest font-bold flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
             {currentPlan.title}
          </div>

          {/* 星期快捷列 (點擊僅切換 viewDate 到本週的該星期，這裡簡化為切換星期顯示) */}
          <div className="flex justify-between bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
            {DAYS_ORDER.map((d, index) => {
              // 簡單邏輯：這裡僅作視覺展示，實際上操作上方日曆更準確
              // 為了讓這個Bar能動，我們假設點擊這裡會跳轉到 "最接近的該星期"
              // 但為了不混淆，我們讓它純粹顯示當前是星期幾
              const isSelected = viewDayName === d;
              return (
                <div key={d} className={`w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${isSelected ? 'bg-white text-black shadow-lg scale-110' : 'text-white/20'}`}>
                  {DAY_ABBREVIATIONS[d]}
                </div>
              );
            })}
          </div>
        </header>

        {/* PROGRESS BAR */}
        {!isEditing && (
          <div className="mb-8 relative h-32 p-6 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden flex items-end shadow-2xl">
            <div className="absolute top-0 bottom-0 left-0 bg-blue-500/30 transition-all duration-1000 ease-out blur-3xl" style={{ width: `${progress}%` }}></div>
            <div className="relative z-10 w-full">
              <div className="text-5xl font-bold mb-1">{progress}%</div>
              <div className="text-white/40 text-xs tracking-[0.2em] uppercase">Completion</div>
            </div>
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          </div>
        )}

        {/* EXERCISE LIST */}
        <div className="flex-1 space-y-4 mb-20 pb-10">
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
        </div>

        {/* --- FULL CALENDAR MODAL --- */}
        {showCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              {/* Modal Background Decor */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
              
              {/* Close Button */}
              <button onClick={() => setShowCalendar(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors z-20">
                <X size={24} />
              </button>
              
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6 px-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold tracking-widest text-white">{calendarTitle}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                  <ChevronRight size={24} />
                </button>
              </div>
              
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 mb-4 text-center">
                {WEEK_HEADERS.map(day => (
                  <div key={day} className="text-xs font-bold text-white/30 uppercase">{day}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-4 gap-x-1">
                {/* Empty slots for start offset */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Actual Days */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  // Construct date string for this specific cell
                  const cellDate = new Date(calendarNavDate.getFullYear(), calendarNavDate.getMonth(), day);
                  const cellDateStr = getLocalISODate(cellDate);
                  
                  const isToday = cellDateStr === todayString;
                  const isSelected = cellDateStr === viewDateString;
                  const hasData = history[cellDateStr];
                  const isDone = hasData && hasData.doneItems && hasData.doneItems.length > 0;
                  
                  return (
                    <button 
                      key={day} 
                      onClick={() => handleDateClick(day)}
                      className={`
                        relative h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all
                        ${isSelected ? 'bg-white text-black shadow-lg scale-110 z-10' : 'text-white/80 hover:bg-white/10'}
                        ${isToday && !isSelected ? 'border border-white/40' : ''}
                      `}
                    >
                      {day}
                      {/* Dots for status */}
                      <div className="absolute -bottom-1 flex gap-0.5">
                        {isDone && <div className="w-1 h-1 rounded-full bg-green-500"></div>}
                        {hasData?.km > 0 && <div className="w-1 h-1 rounded-full bg-blue-400"></div>}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-8 flex justify-center gap-6 text-[10px] text-white/40 uppercase tracking-widest">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Workout</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div>Running</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-white/40"></div>Today</div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}