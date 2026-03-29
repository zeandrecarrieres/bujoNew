import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';

export default function Today() {
  const { currentUser, logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLogText, setNewLogText] = useState('');
  const [newLogType, setNewLogType] = useState('task'); // 'event', 'task', 'note', 'mood'
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null); // Fix for mobile menus

  const today = new Date();
  const dateString = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const dayOfWeek = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const docDateId = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Migration Date Targets
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowId = tomorrow.toISOString().split('T')[0];
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay() + 1)); // Next Monday
  let nextWeekId = nextWeek.toISOString().split('T')[0];
  if (nextWeekId === docDateId) {
      // If today is Monday, next week is +7 days
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeekId = nextWeek.toISOString().split('T')[0];
  }

  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthlyTaskId = `${currentMonthPrefix}-monthly`;

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  async function fetchLogs() {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, `users/${currentUser.uid}/dailyLogs`),
        where("dateId", "==", docDateId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedLogs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      fetchedLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setLogs(fetchedLogs);
    } catch (err) {
      console.error("Error fetching logs:", err);
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
        dateId: docDateId,
        completed: false,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/dailyLogs`), newLog);
      setLogs([...logs, { id: docRef.id, ...newLog }]);
      setNewLogText('');
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding log:", err);
    }
  }

  async function toggleComplete(id, currentStatus, migratedTo) {
    if (migratedTo) return; // Do not complete migrated tasks
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, id), {
        completed: !currentStatus
      });
      setLogs(logs.map(log => log.id === id ? { ...log, completed: !currentStatus } : log));
    } catch (err) {
      console.error("Error updating log:", err);
    }
  }

  async function deleteLog(id) {
    if (!window.confirm("Tem certeza que deseja excluir esta entrada?")) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, id));
      setLogs(logs.filter(log => log.id !== id));
    } catch (err) {
      console.error("Error deleting log:", err);
    }
  }

  async function migrateLog(log, targetTime) {
      const destinations = {
        'tomorrow': 'Amanhã',
        'week': 'Próxima Semana',
        'month': 'Lista de Tarefas do Mês'
      };
      if (!window.confirm(`Deseja migrar este item para ${destinations[targetTime]}?`)) return;
      if (log.migratedTo || log.completed) return;
      
      let newDateId = tomorrowId;
      if (targetTime === 'week') newDateId = nextWeekId;
      if (targetTime === 'month') newDateId = monthlyTaskId;

      try {
          // Mark as migrated in DB
          await updateDoc(doc(db, `users/${currentUser.uid}/dailyLogs`, log.id), {
              migratedTo: targetTime
          });
          
          // Clone it forward
          const clonedLog = {
              text: log.text,
              type: log.type,
              dateId: newDateId,
              completed: false,
              createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, `users/${currentUser.uid}/dailyLogs`), clonedLog);

          setLogs(logs.map(l => l.id === log.id ? { ...l, migratedTo: targetTime } : l));
      } catch (err) {
          console.error("Error migrating log:", err);
      }
  }

  const events = logs.filter(log => log.type === 'event');
  const tasks = logs.filter(log => log.type === 'task');
  const notes = logs.filter(log => log.type === 'note');
  const moods = logs.filter(log => log.type === 'mood');

  const ActionMenu = ({ log }) => (
      <div className={`flex items-center gap-4 bg-surface z-20 w-max md:w-auto transition-opacity md:absolute md:-left-28 md:top-1/2 md:-translate-y-1/2 md:pr-2 
          ${activeMenuId === log.id ? 'opacity-100 flex fade-in animate-in' : 'hidden md:flex md:opacity-0 md:group-hover:opacity-100'}`}>
          {!log.completed && !log.migratedTo && (log.type === 'task' || log.type === 'event') && (
              <>
                  <button onClick={(e) => { e.stopPropagation(); migrateLog(log, 'tomorrow'); setActiveMenuId(null); }} title="Migrar p/ Amanhã" className="text-secondary hover:text-primary material-symbols-outlined text-[24px] md:text-[18px] p-1.5 transition-colors md:p-0">east</button>
                  <button onClick={(e) => { e.stopPropagation(); migrateLog(log, 'week'); setActiveMenuId(null); }} title="Migrar p/ Próx. Semana" className="text-secondary hover:text-primary material-symbols-outlined text-[24px] md:text-[18px] p-1.5 transition-colors md:p-0">keyboard_double_arrow_right</button>
                  <button onClick={(e) => { e.stopPropagation(); migrateLog(log, 'month'); setActiveMenuId(null); }} title="Mover p/ Task List (Geral)" className="text-secondary hover:text-primary material-symbols-outlined text-[24px] md:text-[18px] p-1.5 transition-colors md:p-0">west</button>
              </>
          )}
          <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); setActiveMenuId(null); }} title="Excluir" className="text-red-500/50 hover:text-red-500 material-symbols-outlined text-[24px] md:text-[18px] p-1.5 transition-colors md:p-0">close</button>
      </div>
  );

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-secondary-container" onClick={() => setActiveMenuId(null)}>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f9f9f7] dark:bg-stone-900 border-b border-outline-variant/10">
        <div className="relative flex items-center justify-center w-full px-6 py-3 md:py-4">
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
              <span className="absolute -bottom-6 right-0 text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="min-h-screen pt-16 pb-32 dot-grid px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl mx-auto pb-8">
          {/* Hero Header / Page Intent */}
          <div className="mb-8 space-y-1">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">Diário</span>
            <h2 className="font-headline text-4xl md:text-5xl font-semibold leading-tight italic text-primary flex items-baseline gap-2">
              Hoje
              <span className="text-2xl md:text-3xl font-light text-outline lowercase italic">({dayOfWeek})</span>
            </h2>
            <div className="w-12 h-[2px] bg-[#d4af37] mt-1"></div>
          </div>

          {/* New Entry Form */}
          {isAdding && (
            <div onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleAddLog} className="mb-12 bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30 relative animate-in fade-in slide-in-from-top-2">
                <button 
                    type="button" 
                    onClick={() => setIsAdding(false)} 
                    className="absolute top-4 right-4 text-outline hover:text-primary material-symbols-outlined"
                >
                    close
                </button>
                <h3 className="font-headline italic text-2xl mb-4 text-primary">Nova Entrada</h3>
                <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4 md:gap-4">
                    <button 
                    type="button"
                    onClick={() => setNewLogType('task')}
                    className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'task' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}
                    >
                    <span className="w-2 h-2 bg-current rounded-full"></span> Tarefa
                    </button>
                    <button 
                    type="button"
                    onClick={() => setNewLogType('event')}
                    className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'event' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}
                    >
                    <span className="w-3 h-3 border border-current rounded-full"></span> Evento
                    </button>
                    <button 
                    type="button"
                    onClick={() => setNewLogType('note')}
                    className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'note' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}
                    >
                    <span className="w-3 h-[1px] bg-current"></span> Nota
                    </button>
                    <button 
                    type="button"
                    onClick={() => setNewLogType('mood')}
                    className={`font-label text-[10px] uppercase tracking-widest px-4 py-1 flex items-center gap-2 border ${newLogType === 'mood' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-outline'}`}
                    >
                    <span className="font-headline font-bold text-xs leading-none mt-0.5">=</span> Humor
                    </button>
                </div>
                <input 
                    autoFocus
                    type="text" 
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    placeholder="Escreva algo..." 
                    className="w-full bg-transparent border-0 border-b border-primary focus:ring-0 px-0 py-2 font-body text-lg italic placeholder:text-outline-variant outline-none"
                />
                <button type="submit" className="mt-6 font-label text-xs uppercase tracking-widest hover:opacity-70 text-primary border-b border-primary pb-0.5">
                    Salvar
                </button>
                </form>
            </div>
          )}

          {/* Content Grid / Asymmetric Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Left Column: Primary Log */}
            <div className="md:col-span-8 space-y-8">
              {loading && <p className="font-body text-sm text-outline italic">Carregando os registros...</p>}
              
              {!loading && logs.length === 0 && !isAdding && (
                 <p className="font-headline italic text-xl text-outline-variant">Seu diário está em branco hoje. Comece a anotar.</p>
              )}

              {/* Events Section */}
              {events.length > 0 && (
                <section>
                  <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Eventos</h3>
                  <div className="space-y-3">
                    {events.map(log => (
                      <div key={log.id} className="flex items-start gap-4 group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); else toggleComplete(log.id, log.completed, log.migratedTo); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>
                        
                        {log.migratedTo ? (
                           <div className="font-headline font-medium text-lg text-primary w-4 flex-shrink-0 flex items-center justify-center mt-0.5">{log.migratedTo === 'month' ? '<' : '>'}</div>
                        ) : (
                            <div className={`w-4 h-4 rounded-full border border-primary mt-1 flex-shrink-0 flex items-center justify-center transition-colors ${log.completed ? 'bg-primary' : 'group-hover:bg-primary/5'}`}>
                               {log.completed && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                            </div>
                        )}
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                          <p className={`text-lg font-medium leading-tight ${log.completed ? 'line-through text-outline' : ''} ${log.migratedTo ? 'text-secondary/70 italic' : ''}`}>{log.text}</p>
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
                  <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Tarefas</h3>
                  <div className="space-y-3">
                    {tasks.map(log => (
                      <div key={log.id} className="flex items-start gap-4 group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); else toggleComplete(log.id, log.completed, log.migratedTo); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>

                        {log.migratedTo ? (
                            <div className="font-headline font-medium text-lg text-primary w-4 flex-shrink-0 flex items-center justify-center -ml-1 mt-0.5">{log.migratedTo === 'month' ? '<' : '>'}</div>
                        ) : log.completed ? (
                          <div className="relative mt-2.5 flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full opacity-40"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-[1px] bg-primary rotate-45"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 opacity-80"></div>
                        )}
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[2px]">
                            <p className={`text-lg leading-tight ${log.completed ? 'line-through decoration-1 opacity-40' : ''} ${log.migratedTo ? 'text-secondary/70 italic' : ''}`}>{log.text}</p>
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
                  <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Notas</h3>
                  <div className="space-y-3">
                    {notes.map(log => (
                      <div key={log.id} className="flex items-start gap-4 group relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === log.id) setActiveMenuId(null); }}>
                        <div className="hidden md:block"><ActionMenu log={log} /></div>
                        
                        <div className="w-3 h-[1px] bg-primary mt-3 flex-shrink-0"></div>
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
                  <h3 className="font-label text-xs uppercase tracking-widest text-outline mb-3">Humor</h3>
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

            {/* Right Column: Contextual Widgets / Bento-ish */}
            <div className="md:col-span-4 space-y-8">
              <div className="bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-none border border-outline-variant/10 space-y-4 relative">
                <div className="absolute w-12 h-1 bg-primary top-0 left-0"></div>
                <h4 className="font-label text-[10px] uppercase tracking-widest text-outline">Bujo System</h4>
                <p className="font-body text-sm text-secondary">
                  Ao migrar tarefas inacabadas com <strong>{">"}</strong> ou <strong>{"<"}</strong>, você reavalia o que realmente importa. Se não vale o esforço de reescrever, risque.
                </p>
              </div>
              <div className="aspect-square bg-surface-container p-6 flex flex-col justify-end relative shadow-sm">
                <img className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 mix-blend-multiply" alt="Minimal paper" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBaRw3LonlKvQpeb5BIjr6HJWM8_Z9eQiYgXjLfInV8Uuiom5zD4L2Zai481tWJ3ThzwpjHyxouv1Mtfrmz8T7N6-Asn2nhcR4D71iJUEM5s8vHMqLi73Hul510qIOJV2jGfhAomvcXMZi2AhhTY10vj2HerlvFoCoN8sdCT9_LBBpSPqBMvEjN5PYQ9Kt1qDG75FKlDH7wn6PwXfmHzyVfIy9V3mfQnphP3YVD6vTuBTNWBfBjWsKZq633VtgeBMe0oagqk1OQ9E"/>
                <p className="relative z-10 font-headline text-xl italic leading-tight">"O processo é mais importante que a velocidade."</p>
              </div>
            </div>
          </div>
        </div>
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
