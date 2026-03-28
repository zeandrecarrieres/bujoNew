import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [collectionData, setCollectionData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newEntry, setNewEntry] = useState('');

  useEffect(() => {
    fetchData();
  }, [id, currentUser]);

  async function fetchData() {
    if (!currentUser) return;
    try {
      setLoading(true);
      // Fetch collection details
      const docRef = doc(db, `users/${currentUser.uid}/collections`, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCollectionData(docSnap.data());
      } else {
        navigate('/collections');
        return;
      }

      // Fetch entries
      const q = query(
        collection(db, `users/${currentUser.uid}/collections/${id}/entries`),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEntry(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!newEntry.trim()) return;
        try {
            const entryObj = {
                text: newEntry.trim(),
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, `users/${currentUser.uid}/collections/${id}/entries`), entryObj);
            setEntries([{ id: docRef.id, ...entryObj }, ...entries]);
            setNewEntry('');

            // Increment count
            await updateDoc(doc(db, `users/${currentUser.uid}/collections`, id), {
                entriesCount: increment(1)
            });
        } catch (err) {
            console.error(err);
        }
    }
  }

  async function handleDeleteEntry(entryId) {
      if (!window.confirm("Tem certeza que deseja excluir esta anotação da coleção?")) return;
      try {
          await deleteDoc(doc(db, `users/${currentUser.uid}/collections/${id}/entries`, entryId));
          setEntries(entries.filter(e => e.id !== entryId));
          
          // Decrement count
          await updateDoc(doc(db, `users/${currentUser.uid}/collections`, id), {
            entriesCount: increment(-1)
          });
      } catch (err) {
          console.error(err);
      }
  }

  if (loading || !collectionData) {
      return (
          <div className="font-body text-on-surface min-h-screen pt-24 px-6 text-center">
              <p className="italic text-outline">Lendo os arquivos...</p>
          </div>
      );
  }

  return (
    <div className="font-body text-on-surface selection:bg-secondary-container min-h-screen">
      {/* AppBar Minimal */}
      <header className="w-full top-0 sticky z-40 bg-[#f9f9f7] dark:bg-stone-900 border-b border-outline-variant/20">
        <div className="flex items-center gap-4 px-6 py-4">
          <button onClick={() => navigate('/collections')} className="material-symbols-outlined text-outline hover:text-primary transition-colors cursor-pointer">arrow_back</button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">{collectionData.icon}</span>
            <h1 className="font-serif text-xl italic tracking-tight">{collectionData.title}</h1>
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-6 pt-12 pb-32">
        <section className="mb-12">
            <h2 className="font-headline text-5xl md:text-6xl italic text-primary leading-tight mb-2">{collectionData.title}</h2>
            <p className="font-label text-xs uppercase tracking-widest text-outline">{entries.length} Entradas nesta coleção</p>
        </section>

        {/* Input Area */}
        <section className="mb-16">
            <div className="flex bg-white dark:bg-[#1a1c1b] border border-outline-variant/30 p-4 relative shadow-[0_5px_15px_rgba(0,0,0,0.02)] focus-within:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-outline-variant mr-3 mt-1">edit_square</span>
                <textarea 
                    value={newEntry}
                    onChange={e => setNewEntry(e.target.value)}
                    onKeyDown={handleAddEntry}
                    className="w-full bg-transparent border-none outline-none resize-none font-body text-lg italic placeholder:text-outline-variant/50 min-h-[60px]"
                    placeholder="Escreva algo brilhante aqui... Pressione Enter para salvar na coleção."
                />
            </div>
            <p className="font-body text-[10px] text-outline mt-2 italic text-left">Shift+Enter para quebrar linha. Enter para salvar.</p>
        </section>

        {/* Entries Stream */}
        <section className="space-y-8 relative">
            <div className="absolute left-[15px] top-6 bottom-0 w-[1px] bg-outline-variant/20 z-0"></div>
            
            {entries.length === 0 && (
                <div className="pl-12 pt-8">
                   <p className="font-body italic text-outline">Nenhum registro ainda neste espaço.</p>
                </div>
            )}

            {entries.map(entry => {
                const date = new Date(entry.createdAt);
                const day = String(date.getDate()).padStart(2, '0');
                const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                
                return (
                    <article key={entry.id} className="relative z-10 flex gap-6 group">
                        <div className="bg-[#f9f9f7] dark:bg-stone-900 border border-outline-variant/30 w-8 h-8 rounded-full flex flex-col items-center justify-center shrink-0 mt-1 shadow-sm">
                            <span className="font-headline text-[10px] font-bold text-primary leading-none">{day}</span>
                            <span className="font-label text-[7px] uppercase tracking-tighter text-outline mt-0.5 leading-none">{month}</span>
                        </div>
                        <div className="flex-1 bg-white dark:bg-[#1f2120] p-6 border border-outline-variant/20 shadow-sm relative group-hover:border-primary/30 transition-colors">
                            <button onClick={() => handleDeleteEntry(entry.id)} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                            <p className="font-body text-base leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                        </div>
                    </article>
                );
            })}
        </section>
      </main>
    </div>
  );
}
