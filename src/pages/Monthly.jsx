import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, orderBy, where } from 'firebase/firestore';

export default function Monthly() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('calendario'); // 'calendario' or 'tasklist'

  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  
  const [logs, setLogs] = useState([]);
  const [monthlyLogs, setMonthlyLogs] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Added logic for inline adding logs in Calendar
  const [addingDay, setAddingDay] = useState(null);
  const [newLogText, setNewLogText] = useState('');
  const [newLogType, setNewLogType] = useState('task'); // event, task, note, mood

  // Logic for adding logs in TaskList
  const [isAddingMonthly, setIsAddingMonthly] = useState(false);
  const [newMonthlyLogText, setNewMonthlyLogText] = useState('');
  const [newMonthlyLogType, setNewMonthlyLogType] = useState('task');

  const [activeMenuId, setActiveMenuId] = useState(null);

  // Date Logic for current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const monthName = today.toLocaleDateString('pt-BR', { month: 'long' });
  const dateString = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthlyDateId = `${prefix}-monthly`;

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  async function fetchData() {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // Fetch logs (daily + monthly using prefix trick for Firestore)
      const logsQ = query(
          collection(db, `users/${currentUser.uid}/dailyLogs`),
          where("dateId", ">=", prefix),
          where("dateId", "<=", prefix + "\uf8ff")
      );
      const logsSnap = await getDocs(logsQ);
      const fetchedLogs = [];
      const fetchedMonthlyLogs = [];
      
      logsSnap.forEach(d => {
          const data = d.data();
          if (data.dateId === monthlyDateId) {
             fetchedMonthlyLogs.push({ id: d.id, ...data });
          } else {
             fetchedLogs.push({ id: d.id, ...data });
          }
      });
      // Sort in memory
      fetchedMonthlyLogs.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      setLogs(fetchedLogs);
      setMonthlyLogs(fetchedMonthlyLogs);

      // Fetch goals
      const goalsQ = query(collection(db, `users/${currentUser.uid}/monthlyGoals`), orderBy("createdAt", "asc"));
      const goalsSnap = await getDocs(goalsQ);
      setGoals(goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch habits
      const habitsQ = query(collection(db, `users/${currentUser.uid}/habits`), orderBy("createdAt", "asc"));
      const habitsSnap = await getDocs(habitsQ);
      setHabits(habitsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Add Log (Calendar)
  async function handleAddLog(day) {
      if (!newLogText.trim()) {
           setAddingDay(null);
           return;
      }
      const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
      try {
        const newLog = {
            text: newLogText.trim(),
            type: newLogType,
            dateId: dateStr,
            completed: false,
            createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, `users/${currentUser.uid}/dailyLogs`), newLog);
        setLogs([...logs, { id: docRef.id, ...newLog }]);
        setNewLogText('');
        setAddingDay(null);
      } catch (err) {
        console.error(err);
      }
  }

  // Add Log (Task List)
  async function handleAddMonthlyLog(e) {
      e.preventDefault();
      if (!newMonthlyLogText.trim()) return;
      
      try {
        const newLog = {
          text: newMonthlyLogText,
          type: newMonthlyLogType,
          dateId: monthlyDateId,
          completed: false,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, `users/${currentUser.uid}/dailyLogs`), newLog);
        setMonthlyLogs([...monthlyLogs, { id: docRef.id, ...newLog }]);
        setNewMonthlyLogText('');
        setIsAddingMonthly(false);
      } catch (err) {
        console.error(err);
      }
  }

  async function deleteLog(id, isMonthlyList = false) {
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, id));
      if (isMonthlyList) {
          setMonthlyLogs(monthlyLogs.filter(log => log.id !== id));
      } else {
          setLogs(logs.filter(log => log.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleComplete(id, currentStatus, migratedTo, isMonthlyList = false) {
    if (migratedTo) return;
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, id), {
        completed: !currentStatus
      });
      if (isMonthlyList) {
          setMonthlyLogs(monthlyLogs.map(log => log.id === id ? { ...log, completed: !currentStatus } : log));
      } else {
          setLogs(logs.map(log => log.id === id ? { ...log, completed: !currentStatus } : log));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleHabitLog(habitId, day, currentLogs) {
    const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
    const isCompleted = currentLogs.includes(dateStr);
    try {
      const habitRef = doc(db, `users/${currentUser.uid}/habits`, habitId);
      if (isCompleted) {
        await updateDoc(habitRef, { logs: arrayRemove(dateStr) });
        setHabits(habits.map(h => h.id === habitId ? { ...h, logs: h.logs.filter(d => d !== dateStr) } : h));
      } else {
        await updateDoc(habitRef, { logs: arrayUnion(dateStr) });
        setHabits(habits.map(h => h.id === habitId ? { ...h, logs: [...h.logs, dateStr] } : h));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    if (!newGoal.trim()) return;
    try {
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/monthlyGoals`), {
          text: newGoal,
          createdAt: new Date().toISOString()
      });
      setGoals([...goals, { id: docRef.id, text: newGoal }]);
      setNewGoal('');
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteGoal(id) {
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/monthlyGoals`, id));
        setGoals(goals.filter(g => g.id !== id));
    } catch (err) {
        console.error(err);
    }
  }

  const renderLogIcon = (log) => {
      if (log.type === 'mood') {
          return <span className={`font-headline font-bold text-sm w-4 flex justify-center leading-none mt-0.5 select-none ${log.completed ? 'text-outline' : 'text-primary'}`}>=</span>;
      }
      if (log.type === 'task') {
          return <span className={`material-symbols-outlined text-[12px] mt-1 ${log.completed ? 'text-primary opacity-60' : 'text-outline-variant'} min-w-[16px] text-center`} style={log.completed ? {fontVariationSettings: "'FILL' 0"} : {fontVariationSettings: "'FILL' 1"}}>
             {log.completed ? 'close' : 'circle'}
          </span>;
      }
      if (log.type === 'event') {
          return <span className={`material-symbols-outlined text-[14px] mt-0.5 min-w-[16px] text-center ${log.completed ? 'text-primary' : 'text-outline-variant'}`} style={log.completed ? {fontVariationSettings: "'FILL' 1"} : {fontVariationSettings: "'FILL' 0"}}>
             {log.completed ? 'check_circle' : 'circle'}
          </span>;
      }
      return <span className="material-symbols-outlined text-[14px] text-outline-variant mt-0.5 min-w-[16px] text-center">remove</span>;
  };

  // Organize Monthly Task List
  const monthlyEvents = monthlyLogs.filter(log => log.type === 'event');
  const monthlyTasks = monthlyLogs.filter(log => log.type === 'task');
  const monthlyNotes = monthlyLogs.filter(log => log.type === 'note');

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-secondary-container" onClick={() => setActiveMenuId(null)}>
      {/* TopAppBar */}
      <header className="fixed w-full top-0 z-50 bg-[#f9f9f7] dark:bg-stone-900 border-b border-outline-variant/10">
        <div className="relative flex items-center justify-center w-full px-6 py-3">
          <div className="absolute left-6 flex items-center gap-4">
            <NavLink to="/direcoes" className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
              <span className="material-symbols-outlined text-black dark:text-stone-100" title="Direções">menu</span>
            </NavLink>
          </div>
          
          <h1 className="font-headline text-xl italic tracking-tight text-primary dark:text-stone-100">
            {dateString.charAt(0).toUpperCase() + dateString.slice(1)}
          </h1>

          <div className="absolute right-6 flex items-center gap-4 md:gap-6">
            <button className="active:scale-95 duration-200 hover:opacity-70 transition-opacity flex items-center">
              <span className="material-symbols-outlined text-black dark:text-stone-100">search</span>
            </button>
            <button onClick={logout} className="active:scale-95 duration-200 hover:opacity-70 transition-opacity flex items-center group relative">
              <span className="material-symbols-outlined text-black dark:text-stone-100">logout</span>
              <span className="absolute -bottom-6 right-0 text-[8px] uppercase tracking-widest text-black dark:text-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-32 min-h-screen dot-grid">
        {/* Monthly Header Section */}
        <section className="mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">Visão Mensal</p>
              <h2 className="font-headline italic font-semibold text-4xl md:text-5xl text-primary leading-tight capitalize flex items-baseline gap-2">
                Mês
                <span className="text-2xl md:text-3xl font-light text-outline lowercase italic">({monthName})</span>
              </h2>
              <div className="w-12 h-[2px] bg-[#c88d8d] mt-1"></div>
            </div>
            <div className="max-w-xs md:text-right">
              <p className="font-body text-sm leading-relaxed text-on-surface-variant italic">"A maneira de começar é parar de falar e começar a fazer."</p>
            </div>
          </div>
        </section>

        {/* Tabs Controller */}
        <div className="flex gap-8 border-b border-outline-variant/30 mb-8 relative z-10">
          <button 
             onClick={() => setActiveTab('calendario')} 
             className={`pb-2 uppercase tracking-widest text-xs font-label transition-colors duration-300 ${activeTab === 'calendario' ? 'border-b-2 border-primary text-primary' : 'text-outline hover:text-primary'}`}
          >
             Calendário
          </button>
          <button 
             onClick={() => setActiveTab('tasklist')} 
             className={`pb-2 uppercase tracking-widest text-xs font-label transition-colors duration-300 ${activeTab === 'tasklist' ? 'border-b-2 border-primary text-primary' : 'text-outline hover:text-primary'}`}
          >
             Task List
          </button>
        </div>
        
        {loading && <p className="font-body text-sm text-outline italic relative z-10 mb-8">Sincronizando mês...</p>}

        {/* TAB: CALENDARIO */}
        {!loading && activeTab === 'calendario' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="mb-16 bg-surface-container-lowest shadow-sm border border-outline-variant/20 overflow-x-auto">
                    <div className="min-w-[700px] p-4 md:p-8">
                        {/* Table Header */}
                        <div className="flex border-b border-outline-variant/50 pb-4 mb-2">
                            <div className="w-16 font-label uppercase tracking-widest text-[10px] text-outline shrink-0 pl-2">Data</div>
                            <div className="flex-1 font-label uppercase tracking-widest text-[10px] text-outline pr-4">Registros do Dia</div>
                            {/* Habits Columns */}
                            <div className="flex gap-2 shrink-0 border-l border-outline-variant/10 pl-2">
                                {habits.map(h => (
                                    <div key={h.id} className="w-12 text-center font-headline italic text-[11px] text-primary truncate px-1 shrink-0" title={h.name}>
                                        {h.name.length > 3 ? h.name.substring(0,3) + '.' : h.name}
                                    </div>
                                ))}
                                {habits.length === 0 && <div className="text-[10px] uppercase tracking-widest text-outline/50 italic px-2">Rastreadores</div>}
                            </div>
                        </div>

                        {/* Days List */}
                        <div className="flex flex-col">
                            {daysArray.map(day => {
                                const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
                                const dayLogs = logs.filter(l => l.dateId === dateStr && !l.migratedTo).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
                                const dateObj = new Date(year, month, day);
                                const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                const isToday = dateObj.toDateString() === today.toDateString();

                                return (
                                    <div key={day} className={`flex border-b border-outline-variant/10 py-3 md:py-4 transition-colors group/row ${isWeekend ? 'bg-outline-variant/5' : ''} ${isToday ? 'bg-primary/5' : 'hover:bg-outline-variant/5'}`}>
                                        {/* Date Column */}
                                        <div className="w-16 flex flex-col pt-1 shrink-0 px-2 justify-start">
                                            <span className={`font-headline text-2xl font-light leading-none ${isToday ? 'text-primary font-medium' : ''}`}>{String(day).padStart(2, '0')}</span>
                                            <span className={`font-label text-[10px] uppercase mt-1 ${isWeekend ? 'text-secondary' : 'text-outline'} ${isToday ? 'font-bold' : ''}`}>{dayOfWeek}</span>
                                        </div>

                                        {/* Logs Column */}
                                        <div className="flex-1 pr-6 flex flex-col justify-start gap-1">
                                            {dayLogs.map(log => (
                                                <div key={log.id} className="flex items-start gap-2 group relative cursor-pointer min-h-[24px]" onClick={() => toggleComplete(log.id, log.completed)}>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="absolute -left-6 top-0.5 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-opacity">
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                    <div className="flex-shrink-0 pt-0.5">
                                                        {renderLogIcon(log)}
                                                    </div>
                                                    <p className={`font-body text-sm leading-tight pt-0.5 ${log.completed ? 'line-through text-outline' : 'text-on-surface'}`}>{log.text}</p>
                                                </div>
                                            ))}

                                            {/* Inline Add Log */}
                                            {addingDay === day ? (
                                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 min-h-[28px] mt-1">
                                                    <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="bg-transparent border-b border-primary/30 text-[10px] outline-none py-1 text-primary italic font-headline cursor-pointer shrink-0 appearance-none pr-2">
                                                        <option value="task">Tar</option>
                                                        <option value="event">Evt</option>
                                                        <option value="note">Not</option>
                                                    </select>
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        value={newLogText}
                                                        onChange={e => setNewLogText(e.target.value)}
                                                        onKeyDown={e => { if(e.key === 'Enter') handleAddLog(day); }}
                                                        placeholder="Descreva..."
                                                        className="flex-1 min-w-[120px] bg-transparent border-b border-primary/50 text-sm font-body outline-none py-1 px-1 text-on-surface placeholder:text-outline-variant"
                                                        onBlur={() => setTimeout(() => { if (!newLogText.trim()) setAddingDay(null); }, 200)}
                                                    />
                                                    <div className="flex gap-1 shrink-0">
                                                        <button onClick={() => handleAddLog(day)} className="material-symbols-outlined text-primary text-[16px] hover:opacity-70 p-1">check</button>
                                                        <button onClick={() => {setAddingDay(null); setNewLogText('');}} className="material-symbols-outlined text-outline text-[16px] hover:text-red-500 p-1">close</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div onClick={() => {setAddingDay(day); setNewLogText(''); setNewLogType('task');}} className="font-body text-xs italic text-outline/40 hover:text-primary cursor-text w-max opacity-50 group-hover/row:opacity-100 flex items-center gap-1 transition-opacity min-h-[24px]">
                                                    <span className="material-symbols-outlined text-[14px]">add</span> <span className="pt-0.5">adicionar entrada</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Habits Trackers */}
                                        <div className="flex gap-2 shrink-0 border-l border-outline-variant/10 pl-2">
                                            {habits.map(h => {
                                                const isCompleted = h.logs.includes(dateStr);
                                                return (
                                                    <div key={h.id} onClick={() => toggleHabitLog(h.id, day, h.logs)} className="w-12 h-full min-h-[28px] flex justify-center items-start pt-1 cursor-pointer group">
                                                        <span className={`font-headline text-lg md:text-xl select-none transition-all ${isCompleted ? 'text-primary' : 'text-transparent group-hover:text-primary/20'}`}>X</span>
                                                    </div>
                                                )
                                            })}
                                            {habits.length === 0 && <div className="w-20"></div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>
                
                {/* Monthly Goals Box */}
                <section className="grid md:grid-cols-2 gap-12 mt-12 relative z-10">
                    <div>
                        <h3 className="font-label text-xs uppercase tracking-[0.2em] text-outline mb-8">Objetivos do Mês</h3>
                        <ul className="space-y-6 mb-8">
                        {goals.map((goal, index) => (
                            <li key={goal.id} className="flex items-start gap-4 group">
                            <span className="font-headline text-xl italic text-primary mt-0.5">{String(index + 1).padStart(2, '0')}.</span>
                            <div className="flex-1 border-b border-outline-variant pb-2 relative">
                                <p className="font-body text-lg group-hover:italic transition-all">{goal.text}</p>
                                <button onClick={() => deleteGoal(goal.id)} className="absolute right-0 top-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            </li>
                        ))}
                        </ul>
                        <form onSubmit={handleAddGoal} className="flex flex-col gap-2">
                            <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Adicionar novo foco..." className="w-full bg-transparent border-0 border-b border-outline hover:border-primary focus:border-primary focus:ring-0 px-0 py-2 font-body italic text-sm transition-colors outline-none" />
                        </form>
                    </div>
                    <div className="relative min-h-[200px] flex items-center justify-center bg-surface-container-highest/30 overflow-hidden border border-outline-variant/10">
                        <img alt="Minimalist landscape" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM4PnIHe5QES1benvWS_llHdEQYXKKI8zjCxPLDX6f-dBRaOBIMuMFIAsUjRXtLt44gh_efKU80NovJ3PwnASY-8z-w240ixy51d25K-WhAlXf1yB_EaI1sC1mK_YJzYUI7nMuIOe65kcqa-uRkGvkL9UP0uJ1Ky-nBiZCxQw8V7TeQ9rHfqqsSrHCzpkXcW7Vt-iGnqNLNjMcUinVwPscSm0bsuePQkKg_fw7-EiKt69f0TYZjyiWoPvXrlHgtUw1iMzsuVGGAX0"/>
                        <div className="relative z-10 text-center p-8">
                        <p className="font-label text-[10px] uppercase tracking-widest text-on-surface mb-2">Vibração Mensal</p>
                        <p className="font-headline text-3xl italic">Ritmo Contínuo</p>
                        </div>
                    </div>
                </section>
           </div>
        )}

        {/* TAB: TASK LIST */}
        {!loading && activeTab === 'tasklist' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                
                {/* Form Add Monthly */}
                {isAddingMonthly && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleAddMonthlyLog} className="mb-12 bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30 relative animate-in fade-in slide-in-from-top-2">
                        <button type="button" onClick={() => setIsAddingMonthly(false)} className="absolute top-4 right-4 text-outline hover:text-primary material-symbols-outlined">close</button>
                        <h3 className="font-headline italic text-2xl mb-4 text-primary">Nova Entrada do Mês</h3>
                        <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 md:gap-4">
                            <button type="button" onClick={() => setNewMonthlyLogType('task')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newMonthlyLogType === 'task' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}>
                                <span className="w-2 h-2 bg-current rounded-full"></span> Tarefa
                            </button>
                            <button type="button" onClick={() => setNewMonthlyLogType('event')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newMonthlyLogType === 'event' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}>
                                <span className="w-3 h-3 border border-current rounded-full"></span> Evento
                            </button>
                            <button type="button" onClick={() => setNewMonthlyLogType('note')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newMonthlyLogType === 'note' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}>
                                <span className="w-3 h-[1px] bg-current"></span> Nota
                            </button>
                        </div>
                        <input 
                            autoFocus type="text" value={newMonthlyLogText} onChange={(e) => setNewMonthlyLogText(e.target.value)}
                            placeholder="Ex: Fazer imposto de renda..." className="w-full bg-transparent border-0 border-b border-primary focus:ring-0 px-0 py-2 font-body text-lg italic placeholder:text-outline-variant outline-none"
                        />
                        <button type="submit" className="mt-6 font-label text-xs uppercase tracking-widest hover:opacity-70 text-primary border-b border-primary pb-0.5">Salvar</button>
                        </form>
                    </div>
                )}

                {/* Render Lists */}
                <div className="space-y-12">
                     {!isAddingMonthly && monthlyLogs.length === 0 && (
                        <p className="font-headline italic text-xl text-outline-variant">Nenhum item pendente no mês. Use o botão + abaixo.</p>
                     )}

                     {monthlyEvents.length > 0 && (
                        <section>
                            <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-4">Eventos a Definir</h3>
                            <div className="space-y-4">
                            {monthlyEvents.map(log => (
                                <div key={log.id} className="flex items-start gap-4 group cursor-pointer" onClick={() => toggleComplete(log.id, log.completed, false, true)}>
                                    <div className={`w-4 h-4 rounded-full border border-primary mt-1 flex-shrink-0 flex items-center justify-center transition-colors ${log.completed ? 'bg-primary' : 'group-hover:bg-primary/5'}`}>
                                        {log.completed && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                    </div>
                                    <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                                        <p className={`text-lg font-medium leading-tight ${log.completed ? 'line-through text-outline' : ''}`}>{log.text}</p>
                                        <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id, true); }} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-opacity"><span className="material-symbols-outlined text-[18px]">close</span></button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </section>
                     )}

                     {monthlyTasks.length > 0 && (
                        <section>
                            <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-4">Tarefas do Mês</h3>
                            <div className="space-y-4">
                            {monthlyTasks.map(log => (
                                <div key={log.id} className="flex items-start gap-4 group cursor-pointer" onClick={() => toggleComplete(log.id, log.completed, false, true)}>
                                    {log.completed ? (
                                        <div className="relative mt-2.5 flex-shrink-0">
                                            <div className="w-2 h-2 bg-primary rounded-full opacity-40"></div>
                                            <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-[1px] bg-primary rotate-45"></div></div>
                                        </div>
                                    ) : (
                                        <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 opacity-80"></div>
                                    )}
                                    <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[2px]">
                                        <p className={`text-lg leading-tight ${log.completed ? 'line-through decoration-1 opacity-40' : ''}`}>{log.text}</p>
                                        <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id, true); }} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-opacity"><span className="material-symbols-outlined text-[18px]">close</span></button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </section>
                     )}

                     {monthlyNotes.length > 0 && (
                        <section>
                            <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-4">Notas & Ideias</h3>
                            <div className="space-y-4">
                            {monthlyNotes.map(log => (
                                <div key={log.id} className="flex items-start gap-4 group" onClick={(e) => e.stopPropagation()}>
                                    <div className="w-3 h-[1px] bg-primary mt-3 flex-shrink-0"></div>
                                    <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                                        <p className="text-lg font-headline italic leading-relaxed">{log.text}</p>
                                        <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id, true); }} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-opacity"><span className="material-symbols-outlined text-[18px]">close</span></button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </section>
                     )}
                </div>
           </div>
        )}
      </main>

      {/* FAB works globally but adds monthly logs contextually if in tasklist */}
      <button 
        onClick={(e) => { 
            e.stopPropagation(); 
            if (activeTab === 'tasklist') {
                setIsAddingMonthly(true); 
            } else {
                setActiveTab('tasklist'); 
                setIsAddingMonthly(true);
            }
            window.scrollTo({top: 0, behavior: "smooth"}); 
        }}
        className="fixed right-8 bottom-24 w-14 h-14 bg-primary text-on-primary flex items-center justify-center rounded-none shadow-[0_10px_30px_rgba(26,28,27,0.15)] active:scale-95 duration-300 ease-out z-50 group hover:bg-[#1a1c1b] transition-colors"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

    </div>
  );
}
