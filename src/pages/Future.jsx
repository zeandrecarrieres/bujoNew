import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';

export default function Future() {
  const { currentUser, logout } = useAuth();
  const [semester, setSemester] = useState(1);
  const year = new Date().getFullYear();

  const semester1Months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'];
  const semester2Months = ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const activeMonths = semester === 1 ? semester1Months : semester2Months;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline forms state
  const [addingMonth, setAddingMonth] = useState(null);
  const [newDay, setNewDay] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  async function fetchLogs() {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, `users/${currentUser.uid}/futureLogs`),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitNewLog(monthName) {
    if (!newTitle.trim()) {
      setAddingMonth(null);
      return;
    }
    const safeDay = newDay.trim() ? String(newDay).padStart(2, '0') : '—';
    try {
      const newLog = {
        month: monthName,
        day: safeDay,
        title: newTitle.trim(),
        desc: newDesc.trim(),
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/futureLogs`), newLog);
      setLogs([...logs, { id: docRef.id, ...newLog }]);
      setAddingMonth(null);
      setNewDay('');
      setNewTitle('');
      setNewDesc('');
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteLog(id) {
    if (!window.confirm("Tem certeza que deseja excluir este item do registro futuro?")) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/futureLogs`, id));
      setLogs(logs.filter(log => log.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="font-body selection:bg-primary selection:text-on-primary min-h-screen">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-40 bg-[#f9f9f7] dark:bg-[#1a1c1b]">
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <NavLink to="/direcoes" className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
              <span className="material-symbols-outlined text-black dark:text-stone-100" title="Direções">menu</span>
            </NavLink>
            <h1 className="font-['Newsreader'] italic text-2xl tracking-tight text-black dark:text-white">Diário</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={logout} className="hover:opacity-70 transition-opacity active:transition-transform duration-200 active:scale-95 group relative">
              <span className="material-symbols-outlined text-black dark:text-white">logout</span>
              <span className="absolute -bottom-6 right-0 text-[8px] uppercase tracking-widest text-black dark:text-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </button>
          </div>
        </div>
        <div className="bg-[#f4f4f2] dark:bg-[#2a2c2b] h-[1px] w-full"></div>
      </header>
      
      <main className="relative pb-32">
        {/* Background Dot Grid */}
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-15"></div>
        <section className="max-w-6xl mx-auto px-6 pt-12 relative z-10">
          {/* Header Section */}
          <div className="mb-10">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary mb-2">Planejamento Semestral</p>
            <h2 className="font-headline text-5xl md:text-7xl text-primary leading-none tracking-tighter">Future Logs</h2>
            <div className="mt-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <div className="flex gap-8 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setSemester(1)}
                  className={`font-headline italic text-2xl whitespace-nowrap transition-colors ${semester === 1 ? 'text-primary' : 'text-outline-variant hover:text-primary'}`}
                >
                  1º Semestre
                </button>
                <button 
                  onClick={() => setSemester(2)}
                  className={`font-headline italic text-2xl whitespace-nowrap transition-colors ${semester === 2 ? 'text-primary' : 'text-outline-variant hover:text-primary'}`}
                >
                  2º Semestre
                </button>
              </div>
              <button 
                onClick={() => setAddingMonth(activeMonths[0])}
                className="bg-primary text-on-primary px-4 py-2 flex items-center gap-2 text-sm max-[450px]:hidden hover:opacity-90 transition-opacity active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Novo Evento</span>
              </button>
            </div>
          </div>
          
          {loading && <p className="font-body text-sm text-outline italic">Sincronizando registros do futuro...</p>}

          {/* Grid of 6 Months */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {!loading && activeMonths.map(month => {
              const monthLogs = logs.filter(l => l.month === month).sort((a,b) => {
                  const dayA = isNaN(parseInt(a.day)) ? 99 : parseInt(a.day);
                  const dayB = isNaN(parseInt(b.day)) ? 99 : parseInt(b.day);
                  return dayA - dayB;
              });

              return (
                <div key={month} className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-primary/10 pb-1">
                    <h3 className="font-headline text-3xl text-primary">{month}</h3>
                    <span className="font-label text-[10px] text-outline tracking-widest">{year}</span>
                  </div>
                  <div className="space-y-3">
                    {/* Fetched Entries */}
                    {monthLogs.map((log) => (
                      <div key={log.id} className="group cursor-pointer flex items-start gap-3">
                        <span className="font-headline italic text-lg text-primary w-6">{log.day}</span>
                        <div className="flex-1 border-b border-outline-variant/20 pb-2 group-hover:border-primary transition-colors flex justify-between items-start">
                          <div>
                            <p className="font-body text-sm font-medium leading-tight">{log.title}</p>
                            {log.desc && <p className="font-body text-xs text-secondary mt-1">{log.desc}</p>}
                          </div>
                          <button onClick={() => deleteLog(log.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-sm text-red-500/50 hover:text-red-500">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Inline Form or Add Button Slot */}
                    {addingMonth === month ? (
                       <div className="flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                         <input 
                           value={newDay} 
                           onChange={e => setNewDay(e.target.value)} 
                           placeholder="Dia" 
                           maxLength={2}
                           className="w-8 font-headline italic text-xl text-primary bg-transparent outline-none placeholder:text-outline/50" 
                         />
                         <div className="flex-1 flex flex-col gap-1 border-b border-primary pb-3">
                           <input 
                             value={newTitle} 
                             onChange={e => setNewTitle(e.target.value)} 
                             placeholder="Título (ex: Aniversário)" 
                             autoFocus 
                             className="font-body text-sm font-medium bg-transparent outline-none text-on-surface placeholder:text-outline/50" 
                           />
                           <input 
                             value={newDesc} 
                             onChange={e => setNewDesc(e.target.value)} 
                             placeholder="Descrição curta (opcional)" 
                             onKeyDown={e => e.key === 'Enter' && submitNewLog(month)}
                             className="font-body text-xs text-secondary bg-transparent outline-none placeholder:text-outline/30" 
                           />
                           <div className="flex gap-4 mt-2">
                             <button onClick={() => submitNewLog(month)} className="text-[10px] uppercase tracking-widest text-primary font-bold hover:opacity-70">Salvar</button>
                             <button onClick={() => setAddingMonth(null)} className="text-[10px] uppercase tracking-widest text-outline hover:opacity-70">Cancelar</button>
                           </div>
                         </div>
                       </div>
                    ) : (
                      <div onClick={() => {
                          setAddingMonth(month);
                          setNewDay('');
                          setNewTitle('');
                          setNewDesc('');
                      }} className="flex items-start gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-text">
                        <span className="font-headline italic text-lg w-6">—</span>
                        <div className="flex-1 border-b border-dashed border-outline-variant pb-2">
                          <p className="font-body text-xs italic leading-tight">Adicionar registro...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Bento Layout for Side Notes & Mood */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 p-8 bg-surface-container-low rounded-lg relative overflow-hidden group">
              <h4 className="font-headline italic text-2xl mb-4">Metas do {semester}º Semestre</h4>
              <ul className="space-y-3 font-body text-sm relative z-10">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Finalizar manuscrito do novo livro</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Implementar rotina de meditação matinal</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Reduzir tempo de tela em 30%</li>
              </ul>
              <img className="absolute -right-12 -bottom-12 w-48 opacity-10 grayscale group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" alt="close-up of elegant fountain pen" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCurdXbmeXg1ZN06AYQlKr9cXNk8l9qhVkX5sXwWuk9mLXAol98m_kBFN22usG-_vrYnGK8yS76HE2xjDT3Sh_eaOO490hQS7ZTb2AUSkxQnTJmD9I0CNu3r7xrYu3e3XlCYFXJURN0nWDTjOSozXq2hr5rXSpmP6v3WSUwayvcnG0ClqCfbOT_5D09YOgc8ppIiyKaG5em3d7elaDkM17TfaXWMq8LV0ucfd9FfEI1Y2KUUjFb3L3WZ8xSPT7OR0p15SScAaASESU"/>
            </div>
            <div className="p-8 bg-surface-container rounded-lg border border-outline-variant/10">
              <h4 className="font-headline italic text-2xl mb-4">Humor</h4>
              <div className="flex flex-col gap-4">
                <p className="font-body text-sm leading-relaxed text-secondary italic">"Buscando clareza na simplicidade do traço."</p>
                <div className="w-full h-1 bg-outline-variant/20 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-primary"></div>
                </div>
                <p className="font-label text-[10px] uppercase tracking-widest text-primary">Foco Atingido: 75%</p>
              </div>
            </div>
            <div className="p-8 bg-primary text-on-primary rounded-lg flex flex-col justify-between">
              <span className="material-symbols-outlined text-4xl">calendar_month</span>
              <div>
                <p className="font-headline italic text-3xl">Próximo Passo</p>
                <p className="font-body text-sm mt-2 opacity-80 uppercase tracking-tighter">Preparar {activeMonths[1]}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
