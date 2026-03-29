import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';

export default function Weekly() {
  const { currentUser, logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newLogText, setNewLogText] = useState('');
  const [newLogType, setNewLogType] = useState('task');
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Date Logic for current week (Monday to Sunday)
  const curr = new Date();
  const getMonday = (d) => {
    const dCopy = new Date(d);
    var day = dCopy.getDay(),
        diff = dCopy.getDate() - day + (day == 0 ? -6:1);
    return new Date(dCopy.setDate(diff));
  }
  
  const monday = getMonday(curr);
  const weekDates = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d,
      dateId: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
      dayShort: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      dayNumber: d.getDate(),
      monthShort: d.toLocaleDateString('pt-BR', { month: 'short' })
    };
  });

  const titleString = `${weekDates[0].dayNumber} ${weekDates[0].monthShort} — ${weekDates[6].dayNumber} ${weekDates[6].monthShort}`;
  
  // Weekly aggregation scope (strictly the generic week bucket to prevent daily log bleeding and duplication)
  const currentWeekDates = weekDates.map(d => d.dateId);
  const weeklyBucketId = `${currentWeekDates[0]}-weekly`;
  const fetchFilterScope = [weeklyBucketId];

  const todayId = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  async function fetchLogs() {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(collection(db, `users/${currentUser.uid}/dailyLogs`));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLog(e) {
    e.preventDefault();
    if (!newLogText.trim()) return;
    
    try {
      const newLog = {
        text: newLogText,
        type: newLogType,
        dateId: weeklyBucketId, // Logs created in Weekly View always fall into the week's general bucket
        completed: false,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/dailyLogs`), newLog);
      setLogs([...logs, { id: docRef.id, ...newLog }]);
      setNewLogText('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleComplete(id, currentStatus) {
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, id), {
        completed: !currentStatus
      });
      setLogs(logs.map(log => log.id === id ? { ...log, completed: !currentStatus } : log));
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteLog(id) {
    if (!window.confirm("Tem certeza que deseja excluir esta entrada da semana?")) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, id));
      setLogs(logs.filter(log => log.id !== id));
    } catch (err) {
      console.error("Error deleting log:", err);
    }
  }

  // Create a duplicate item strictly designated for Today.
  async function duplicateToToday(log) {
    if (log.dateId === todayId || log.completed) return;
    if (!window.confirm("Deseja puxar este item para Hoje?")) return;
    try {
      const clonedLog = {
        text: log.text,
        type: log.type,
        dateId: todayId,
        completed: false,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/dailyLogs`), clonedLog);
      setLogs([...logs, { id: docRef.id, ...clonedLog }]);
    } catch (err) {
      console.error(err);
    }
  }

  const weeklyLogs = logs.filter(log => fetchFilterScope.includes(log.dateId)).sort((a,b) => {
     if (a.dateId === b.dateId) {
        return new Date(a.createdAt) - new Date(b.createdAt);
     }
     return new Date(a.dateId) - new Date(b.dateId);
  });

  const events = weeklyLogs.filter(log => log.type === 'event');
  const tasks = weeklyLogs.filter(log => log.type === 'task');
  const notes = weeklyLogs.filter(log => log.type === 'note');
  const moods = weeklyLogs.filter(log => log.type === 'mood');

  const ActionMenu = ({ log }) => (
      <div className={`flex items-center gap-4 bg-surface z-20 w-max md:w-auto transition-opacity md:absolute md:-left-20 md:top-1/2 md:-translate-y-1/2 md:pr-2 
          ${activeMenuId === log.id ? 'opacity-100 inline-flex fade-in animate-in' : 'hidden md:flex md:opacity-0 md:group-hover:opacity-100'}`}>
          {log.dateId !== todayId && !log.completed && (
              <button onClick={(e) => { e.stopPropagation(); duplicateToToday(log); setActiveMenuId(null); }} title="Puxar para Hoje" className="text-secondary hover:text-primary material-symbols-outlined text-[24px] md:text-[18px] p-1.5 transition-colors md:p-0">today</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); setActiveMenuId(null); }} title="Excluir" className="text-red-500/50 hover:text-red-500 material-symbols-outlined text-[24px] md:text-[18px] p-1.5 transition-colors md:p-0">close</button>
      </div>
  );

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-secondary-container min-h-screen pb-24" onClick={() => setActiveMenuId(null)}>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f9f9f7] dark:bg-stone-900 border-b border-outline-variant/10">
        <div className="relative flex items-center justify-center w-full px-6 py-3">
          <div className="absolute left-6 flex items-center gap-4">
            <NavLink to="/direcoes" className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
              <span className="material-symbols-outlined text-black dark:text-stone-100" title="Direções">menu</span>
            </NavLink>
          </div>
          
          <h1 className="font-headline text-xl italic tracking-tight text-primary dark:text-stone-100">{titleString.charAt(0).toUpperCase() + titleString.slice(1)}</h1>
          
          <div className="absolute right-6 flex items-center gap-4 md:gap-6">
            <button className="active:scale-95 duration-200 hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-black dark:text-stone-100">search</span>
            </button>
            <button onClick={logout} className="active:scale-95 duration-200 hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-black dark:text-stone-100">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="relative pt-16 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="fixed inset-0 dot-grid pointer-events-none z-0"></div>

        {/* Hero Editorial Section */}
        <section className="relative z-10 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-baseline gap-4">
            <div className="max-w-xl">
              <span className="font-label uppercase tracking-[0.2em] text-[10px] text-outline mb-1 block">Visão Semanal</span>
              <h2 className="font-headline italic font-semibold text-4xl md:text-5xl text-primary leading-tight">Semana</h2>
              <div className="w-12 h-[2px] bg-[#9b2226] mt-1"></div>
            </div>
            <div className="hidden md:block text-right">
              <p className="font-label text-xs uppercase tracking-widest text-outline">Semana atual</p>
            </div>
          </div>
        </section>

        {/* New Entry Form */}
        {isAdding && (
          <div onClick={(e) => e.stopPropagation()} className="mb-12 bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30 relative animate-in fade-in slide-in-from-top-2 z-20">
            <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="absolute top-4 right-4 text-outline hover:text-primary material-symbols-outlined"
            >
                close
            </button>
            <h3 className="font-headline italic text-2xl mb-8 text-primary">Esboços e Backlog da Semana</h3>

            <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4 md:gap-4">
                <button type="button" onClick={() => setNewLogType('task')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'task' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}><span className="w-2 h-2 bg-current rounded-full"></span> Tarefa</button>
                <button type="button" onClick={() => setNewLogType('event')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'event' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}><span className="w-3 h-3 border border-current rounded-full"></span> Evento</button>
                <button type="button" onClick={() => setNewLogType('note')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'note' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}><span className="w-3 h-[1px] bg-current"></span> Nota</button>
                <button type="button" onClick={() => setNewLogType('mood')} className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'mood' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}><span className="font-headline font-bold text-xs leading-none mt-0.5">=</span> Humor</button>
            </div>
            
            <form onSubmit={handleAddLog} className="flex flex-col">
              <input 
                  autoFocus
                  type="text" 
                  value={newLogText}
                  onChange={(e) => setNewLogText(e.target.value)}
                  placeholder="Despeje algo para realizar esta semana..." 
                  className="w-full bg-transparent border-0 border-b border-primary focus:ring-0 px-0 py-2 font-body text-lg italic placeholder:text-outline-variant outline-none"
              />
              <button type="submit" className="mt-6 font-label text-xs uppercase tracking-widest hover:opacity-70 text-primary border-b border-primary pb-0.5 self-start">
                  Salvar
              </button>
            </form>
          </div>
        )}

        {loading && <p className="font-body text-sm text-outline italic relative z-10">Sincronizando tarefas da semana...</p>}
        
        {!loading && weeklyLogs.length === 0 && !isAdding && (
            <p className="font-headline italic text-xl text-outline-variant relative z-10">Nenhum evento ou tarefa na visão semanal.</p>
        )}

        <div className="relative z-10 mt-8 space-y-8">
            {/* Events Section */}
            {events.length > 0 && (
            <section>
                <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Eventos Essenciais</h3>
                <div className="space-y-3">
                {events.map(log => (
                    <div key={log.id} className="flex items-start gap-4 group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); else toggleComplete(log.id, log.completed); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>
                        
                        <div className={`w-4 h-4 rounded-full border border-primary mt-1.5 flex-shrink-0 flex items-center justify-center transition-colors ${log.completed ? 'bg-primary' : 'group-hover:bg-primary/5'}`}>
                            {log.completed && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                        </div>
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                            <p className={`text-lg font-medium leading-tight ${log.completed ? 'line-through text-outline' : ''}`}>{log.text}</p>
                            <div className="md:hidden flex items-center shrink-0">
                                <ActionMenu log={log} />
                                {activeMenuId !== log.id && (
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(log.id); }} className="text-outline-variant hover:text-primary material-symbols-outlined text-[20px] active:scale-95 ml-2">more_horiz</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </section>
            )}

            {/* Tasks Section */}
            {tasks.length > 0 && (
            <section>
                <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Tarefas Soltas</h3>
                <div className="space-y-3">
                {tasks.map(log => (
                    <div key={log.id} className="flex items-start gap-4 group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); else toggleComplete(log.id, log.completed); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>
                        
                        {log.completed ? (
                            <div className="relative mt-3 flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full opacity-40"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-4 h-[1px] bg-primary rotate-45"></div>
                            </div>
                            </div>
                        ) : (
                            <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                        )}
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[4px]">
                            <p className={`text-lg leading-tight ${log.completed ? 'line-through decoration-1 opacity-40' : ''}`}>{log.text}</p>
                            <div className="md:hidden flex items-center shrink-0">
                                <ActionMenu log={log} />
                                {activeMenuId !== log.id && (
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(log.id); }} className="text-outline-variant hover:text-primary material-symbols-outlined text-[20px] active:scale-95 ml-2">more_horiz</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </section>
            )}

            {/* Notes Section */}
            {notes.length > 0 && (
            <section>
                <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Notas Visuais</h3>
                <div className="space-y-3">
                {notes.map(log => (
                    <div key={log.id} className="flex items-start gap-4 group relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>
                        
                        <div className="w-3 h-[1px] bg-primary mt-3.5 flex-shrink-0"></div>
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                            <p className="text-lg font-headline italic leading-relaxed">{log.text}</p>
                            <div className="md:hidden flex items-center shrink-0">
                                <ActionMenu log={log} />
                                {activeMenuId !== log.id && (
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(log.id); }} className="text-outline-variant hover:text-primary material-symbols-outlined text-[20px] active:scale-95 ml-2">more_horiz</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </section>
            )}

            {/* Moods Section */}
            {moods.length > 0 && (
            <section>
                <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Clima</h3>
                <div className="space-y-3">
                {moods.map(log => (
                    <div key={log.id} className="flex items-start gap-4 group relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>
                        
                        <div className="font-headline font-bold text-xl text-primary mt-0.5 select-none w-3 text-center leading-none">=</div>
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                            <p className="text-lg font-body leading-relaxed">{log.text}</p>
                            <div className="md:hidden flex items-center shrink-0">
                                <ActionMenu log={log} />
                                {activeMenuId !== log.id && (
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(log.id); }} className="text-outline-variant hover:text-primary material-symbols-outlined text-[20px] active:scale-95 ml-2">more_horiz</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </section>
            )}
        </div>

        {/* Foco Semanais (Bottom Bento content) */}
        {(weeklyLogs.length > 0 || !loading) && (
            <section className="mt-16 bg-surface-container-low p-8 relative overflow-hidden z-10 max-w-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                <img alt="Decorative quill" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEzxXtG3zWbkhfjBa60ZFYn2C4sOBcgs2_fMQJFimP2stgAC75xi3eKKZEZfGEhnJS6Nbhldvmnm2LAd_ZgP8jDVP0Zkvmq38Vt-41plRRmqmcgcweQRtVFDLTtkRpcBX1IMKeqhlTS-tW2kklcIfSTicku6YyAWX0xoQVYqOxnxi7niOkXSOxRDTY6P93BirLdfAFfyZsqQAXjspuLErcITq5y57W7B3y9Wflzvdz_viNazpyy8f3FUMWtuhVl5Is4J6t95xpliWBQ"/>
              </div>
              <div className="relative z-10 flex flex-col md:flex-row gap-12">
                <div className="flex-1">
                  <h3 className="font-headline italic text-3xl mb-4">Foco Semanal</h3>
                  <p className="font-body text-secondary text-sm leading-relaxed">Avalie as tarefas soltas acima. Ao definir sua prioridade principal, utilize o botão do calendário nas tarefas essenciais para puxá-las diretamente para o seu Diário de hoje.</p>
                </div>
              </div>
            </section>
        )}
      </main>

      {/* FAB */}
      <button 
        onClick={(e) => { e.stopPropagation(); setIsAdding(true); window.scrollTo({top: 0, behavior: "smooth"}); }}
        className="fixed right-8 bottom-24 w-14 h-14 bg-primary text-on-primary flex items-center justify-center rounded-none shadow-[0_10px_30px_rgba(26,28,27,0.15)] active:scale-95 duration-300 ease-out z-50 group hover:bg-[#1a1c1b] transition-colors"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

    </div>
  );
}
