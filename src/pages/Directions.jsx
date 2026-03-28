import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { NavLink } from 'react-router-dom';

export default function Directions() {
  const { currentUser, logout } = useAuth();
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    fetchDirections();
  }, [currentUser]);

  async function fetchDirections() {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(collection(db, `users/${currentUser.uid}/directions`), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDirections(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    
    try {
      const newOrder = directions.length > 0 ? directions[directions.length - 1].order + 100 : 100;
      const newItem = {
        text: newText,
        order: newOrder,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/directions`), newItem);
      setDirections([...directions, { id: docRef.id, ...newItem }]);
      setNewText('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteItem(id) {
    if (!window.confirm("Tem certeza que deseja excluir esta direção?")) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/directions`, id));
      setDirections(directions.filter(d => d.id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  }

  async function moveItem(index, direction) {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === directions.length - 1) return;

    const newDirections = [...directions];
    const itemA = newDirections[index];
    const itemB = newDirections[direction === 'up' ? index - 1 : index + 1];

    // Swap their order values
    const tempOrder = itemA.order;
    itemA.order = itemB.order;
    itemB.order = tempOrder;

    // Optimistically update UI sort
    newDirections.sort((a,b) => a.order - b.order);
    setDirections(newDirections);

    // Save to Firebase
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/directions`, itemA.id), { order: itemA.order });
      await updateDoc(doc(db, `users/${currentUser.uid}/directions`, itemB.id), { order: itemB.order });
    } catch (error) {
       console.error("Failed to reorder", error);
       fetchDirections(); // revert if failed
    }
  }

  const ActionMenu = ({ item, index }) => (
      <div className={`flex items-center gap-1.5 bg-surface z-10 w-max md:w-auto transition-opacity md:absolute md:-left-24 md:top-1/2 md:-translate-y-1/2 md:pr-2 
          ${activeMenuId === item.id ? 'opacity-100 inline-flex fade-in animate-in' : 'hidden md:flex md:opacity-0 md:group-hover:opacity-100'}`}>
          {index > 0 && (
             <button onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); setActiveMenuId(null); }} title="Mover para Cima" className="text-secondary hover:text-primary material-symbols-outlined text-[18px] md:text-[16px] transition-colors md:p-0">arrow_upward</button>
          )}
          {index < directions.length - 1 && (
             <button onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); setActiveMenuId(null); }} title="Mover para Baixo" className="text-secondary hover:text-primary material-symbols-outlined text-[18px] md:text-[16px] transition-colors md:p-0">arrow_downward</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); setActiveMenuId(null); }} title="Excluir" className="text-red-500/50 hover:text-red-500 material-symbols-outlined text-[18px] md:text-[16px] transition-colors md:p-0">close</button>
      </div>
  );

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-secondary-container-low min-h-screen pb-24" onClick={() => setActiveMenuId(null)}>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f9f9f7] dark:bg-stone-900 border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-6 py-3 w-full">
          <NavLink to="/" className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
            <span className="material-symbols-outlined text-black dark:text-stone-100" title="Voltar ao Diário">arrow_back</span>
          </NavLink>
          <h1 className="font-serif italic font-medium text-2xl tracking-tight text-black dark:text-stone-100 capitalize">Bússola</h1>
          <div className="flex items-center gap-4">
            <button onClick={logout} className="active:scale-95 duration-200 hover:opacity-70 transition-opacity flex items-center group relative">
              <span className="material-symbols-outlined text-black dark:text-stone-100">logout</span>
              <span className="absolute -bottom-6 right-0 text-[8px] uppercase tracking-widest text-black dark:text-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="relative pt-24 px-6 md:px-12 max-w-3xl mx-auto">
        <div className="fixed inset-0 dot-grid pointer-events-none z-0 opacity-40"></div>

        {/* Hero Editorial Section */}
        <section className="relative z-10 mb-12">
          <div className="max-w-xl">
            <span className="font-label uppercase tracking-[0.2em] text-[10px] text-outline mb-1 block">Princípios</span>
            <h2 className="font-headline italic text-5xl md:text-6xl text-primary leading-tight">Direções</h2>
            <p className="font-body text-outline mt-3 leading-relaxed max-w-md">Lista de propósitos e focos da vida. Registros duradouros criados sem vínculos de datas, usados exclusivamente para nortear escolhas, atitudes e objetivos maiores no seu diário.</p>
            <div className="w-12 h-[1px] bg-primary mt-6"></div>
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
            <h3 className="font-headline italic text-2xl mb-8 text-primary">Novo Princípio</h3>

            <form onSubmit={handleAdd} className="flex flex-col">
              <input 
                  autoFocus
                  type="text" 
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Escreva algo para manter sempre à vista..." 
                  className="w-full bg-transparent border-0 border-b border-primary focus:ring-0 px-0 py-2 font-body text-lg italic placeholder:text-outline-variant outline-none"
              />
              <button type="submit" className="mt-6 font-label text-xs uppercase tracking-widest hover:opacity-70 text-primary border-b border-primary pb-0.5 self-start">
                  Gravar
              </button>
            </form>
          </div>
        )}

        {loading && <p className="font-body text-sm text-outline italic relative z-10">Procurando direções...</p>}
        
        {!loading && directions.length === 0 && !isAdding && (
            <p className="font-headline italic text-xl text-outline-variant relative z-10">Você ainda não firmou direções sólidas. Escreva as primeiras usando o botão + abaixo.</p>
        )}

        <div className="relative z-10 mt-8 space-y-6">
            {directions.length > 0 && (
                <div className="space-y-4">
                {directions.map((d, i) => (
                    <div key={d.id} className="flex items-start gap-4 group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); if (activeMenuId === d.id) setActiveMenuId(null); }}>
                        <div className="hidden md:block"><ActionMenu item={d} index={i} /></div>
                        
                        <div className="flex-1 flex justify-between gap-2 overflow-hidden items-start pt-[1px]">
                            <p className="text-xl md:text-2xl font-headline italic leading-tight pr-4 text-primary whitespace-pre-wrap">{d.text}</p>
                            <div className="md:hidden flex items-center shrink-0">
                                <ActionMenu item={d} index={i} />
                                {activeMenuId !== d.id && (
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(d.id); }} className="text-outline-variant hover:text-primary material-symbols-outlined text-[24px] active:scale-95 ml-2">more_horiz</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      </main>

      {/* Bottom Padding explicitly to avoid obscuring content */}
      <div className="h-24 md:h-0"></div>

      {/* FAB */}
      <button 
        onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding); window.scrollTo({top: 0, behavior: "smooth"}); }}
        className="fixed right-8 bottom-24 w-14 h-14 bg-primary text-on-primary flex items-center justify-center rounded-none shadow-[0_10px_30px_rgba(26,28,27,0.15)] active:scale-95 duration-300 ease-out z-50 group hover:bg-[#1a1c1b] transition-colors"
      >
        <span className="material-symbols-outlined text-3xl">{isAdding ? 'close' : 'add'}</span>
      </button>

    </div>
  );
}
