import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';

export default function HabitTracker() {
  const { currentUser, logout } = useAuth();
  const [habits, setHabits] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(true);

  // Month handling
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    fetchHabits();
  }, [currentUser]);

  async function fetchHabits() {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, `users/${currentUser.uid}/habits`),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      const fetchedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHabits(fetchedHabits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddHabit(e) {
    if (e.key === 'Enter' || e.type === 'blur') {
      if (!newHabitName.trim()) {
        setIsAdding(false);
        return;
      }
      try {
        const newHabit = {
          name: newHabitName,
          logs: [], // Array of YYYY-MM-DD
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, `users/${currentUser.uid}/habits`), newHabit);
        setHabits([...habits, { id: docRef.id, ...newHabit }]);
        setNewHabitName('');
        setIsAdding(false);
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function toggleHabitLog(habitId, day, currentLogs) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

  // Calculate consistency
  const totalPossible = habits.length * today.getDate(); // Up to today
  const totalCompleted = habits.reduce((acc, obj) => acc + obj.logs.filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length, 0);
  const consistencyPercent = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);

  return (
    <div className="font-body text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f9f9f7] dark:bg-[#1a1c1b] transition-all">
        <div className="relative flex items-center justify-center w-full px-6 py-4">
          <div className="absolute left-6 flex items-center gap-4">
            <span className="material-symbols-outlined text-black dark:text-white cursor-pointer hover:opacity-70 transition-opacity">menu</span>
          </div>

          <h1 className="font-headline text-xl italic tracking-tight text-primary dark:text-white capitalize">Hábitos</h1>

          <div className="absolute right-6 flex items-center gap-4 md:gap-6">
            <button onClick={logout} className="active:scale-95 duration-200 hover:opacity-70 transition-opacity flex items-center group relative">
              <span className="material-symbols-outlined text-black dark:text-stone-100">logout</span>
              <span className="absolute -bottom-6 right-0 text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </button>
          </div>
        </div>
        <div className="bg-[#f4f4f2] dark:bg-[#2a2c2b] h-[1px] w-full"></div>
      </header>
      
      <main className="max-w-[1400px] mx-auto px-6 pt-16 dot-grid min-h-screen">
        {/* Editorial Header */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="font-label text-xs uppercase tracking-[0.2em] text-outline mb-4 block capitalize">{monthName}</span>
              <h2 className="font-headline italic font-semibold text-4xl md:text-5xl text-primary leading-tight">Hábitos</h2>
              <div className="w-12 h-[2px] bg-[#2a9d8f] mt-1"></div>
            </div>
            <div className="flex flex-col items-start md:items-end">
              <p className="font-headline italic text-xl text-secondary max-w-[280px] md:text-right">
                "A excelência não é um ato, mas um hábito."
              </p>
            </div>
          </div>
        </section>
        
        {/* Habit Tracker Canvas */}
        <div className="bg-surface-container-lowest shadow-[0_10px_30px_rgba(26,28,27,0.04)] overflow-x-auto rounded-none border-l-4 border-primary">
          <div className="min-w-[1000px] p-8">
            {/* Days Header */}
            <div className="grid grid-cols-[160px_repeat(31,_minmax(28px,_1fr))] mb-6 border-b border-outline-variant/30 pb-4">
              <div className="font-headline italic text-lg text-primary self-end">Hábito</div>
              {/* Calendar Days 1-31 */}
              <div className="contents">
                {daysArray.map(day => {
                  const isToday = day === today.getDate();
                  return (
                    <div key={`header-${day}`} className={`flex flex-col items-center justify-center font-label text-[10px] ${isToday ? 'font-bold text-primary' : 'text-outline'}`}>
                      {String(day).padStart(2, '0')}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {loading && <p className="font-body text-sm text-outline italic">Carregando seus hábitos...</p>}

            {/* Habit Rows */}
            <div className="space-y-6">
              {habits.map((habit, index) => (
                <div key={habit.id} className="grid grid-cols-[160px_repeat(31,_minmax(28px,_1fr))] items-center group">
                  <div className="font-body text-sm font-medium tracking-tight group-hover:pl-2 transition-all duration-300 pr-4 truncate" title={habit.name}>
                    {habit.name}
                  </div>
                  <div className="contents">
                    {daysArray.map(day => {
                      if (day > daysInMonth) return <div key={`empty-${day}`} className="flex justify-center border border-transparent"></div>;
                      
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isCompleted = habit.logs.includes(dateStr);
                      // Adding a subtle rotation for aesthetic variation
                      const rotateClass = isCompleted ? (day % 3 === 0 ? 'rotate-12' : day % 2 === 0 ? '-rotate-6' : 'rotate-45') : '';

                      return (
                        <div key={`${habit.id}-${day}`} className="flex justify-center cursor-pointer group/cell p-1" onClick={() => toggleHabitLog(habit.id, day, habit.logs)}>
                          <div className={`w-4 h-4 transition-all duration-300 ${isCompleted ? `bg-primary rounded-none ${rotateClass}` : 'border border-outline-variant/30 rounded-none group-hover/cell:border-primary/50'}`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Add New Habit Row */}
              {isAdding ? (
                 <div className="grid grid-cols-[160px_repeat(31,_minmax(28px,_1fr))] items-center">
                   <div className="pr-4">
                     <input 
                       autoFocus
                       type="text" 
                       value={newHabitName}
                       onChange={(e) => setNewHabitName(e.target.value)}
                       onKeyDown={handleAddHabit}
                       onBlur={handleAddHabit}
                       placeholder="Novo Hábito..." 
                       className="w-full bg-transparent border-0 border-b border-primary focus:ring-0 px-0 py-1 font-body text-sm italic placeholder:text-outline-variant outline-none"
                     />
                   </div>
                 </div>
              ) : (
                <div className="grid grid-cols-[160px_repeat(31,_minmax(28px,_1fr))] items-center pt-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer delay-100" onClick={() => setIsAdding(true)}>
                  <div className="font-headline italic text-sm text-outline border-b border-outline-variant/20 py-1 inline-block w-max">Adicionar novo...</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Secondary Section: Stats & Mood */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface-container-low p-8 flex flex-col justify-between aspect-square md:aspect-auto">
            <div>
              <span className="font-label text-[10px] uppercase tracking-widest text-outline">Consistência Mensal</span>
              <h3 className="font-headline text-4xl md:text-5xl lg:text-6xl mt-2">{consistencyPercent}%</h3>
            </div>
            <div className="h-2 w-full bg-outline-variant/20 mt-4 overflow-hidden relative">
              <div className="h-full bg-primary transition-all duration-1000 ease-out absolute left-0 top-0" style={{width: `${consistencyPercent}%`}}></div>
            </div>
            <p className="font-body text-xs text-secondary mt-4 italic">Medido em relação ao progresso até hoje.</p>
          </div>
          
          <div className="bg-surface-container-low p-8 flex flex-col justify-between aspect-square md:aspect-auto">
            <div>
              <span className="font-label text-[10px] uppercase tracking-widest text-outline">Melhor Hábito</span>
              <h3 className="font-headline text-2xl lg:text-3xl mt-2 line-clamp-2">
                {habits.length > 0 ? 
                  [...habits].sort((a,b) => b.logs.length - a.logs.length)[0].name : 
                  'Nenhum ainda'
                }
              </h3>
            </div>
            <div className="flex gap-1 mt-4 flex-wrap max-h-8 overflow-hidden">
               {habits.length > 0 && Array.from({length: Math.min(20, [...habits].sort((a,b) => b.logs.length - a.logs.length)[0].logs.length)}).map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-primary"></div>
               ))}
            </div>
            <p className="font-body text-xs text-secondary mt-4 italic">Seu hábito de maior sucesso este mês.</p>
          </div>
          
          <div className="bg-primary text-on-primary p-8 flex flex-col justify-center items-center text-center aspect-square md:aspect-auto">
            <span className="font-label text-[10px] uppercase tracking-widest opacity-60 mb-4 text-white">Foco de Hoje</span>
            <p className="font-headline text-2xl text-white italic">"O segredo do seu futuro está escondido na rotina."</p>
          </div>
        </section>
      </main>
      
      
      
      {/* Floating Action Button for Adding Habits */}
      <button onClick={() => {setIsAdding(true); window.scrollTo({top: 0, behavior: "smooth"});}} className="fixed bottom-20 right-8 md:bottom-10 md:right-10 w-14 h-14 bg-primary text-on-primary shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center z-50 group transition-transform active:scale-90">
        <span className="material-symbols-outlined text-white">add</span>
      </button>
    </div>
  );
}
