import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, orderBy, deleteDoc, doc } from 'firebase/firestore';

export default function Collections() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColIcon, setNewColIcon] = useState('lightbulb');
  const [loading, setLoading] = useState(true);

  const icons = ['lightbulb', 'favorite', 'travel_explore', 'book', 'edit_note', 'local_cafe', 'psychology'];

  useEffect(() => {
    fetchCollections();
  }, [currentUser]);

  async function fetchCollections() {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, `users/${currentUser.uid}/collections`),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCollections(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCollection(e) {
    e.preventDefault();
    if (!newColTitle.trim()) return;
    
    try {
      const newCollection = {
        title: newColTitle,
        icon: newColIcon,
        entriesCount: 0,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, `users/${currentUser.uid}/collections`), newCollection);
      setCollections([{ id: docRef.id, ...newCollection }, ...collections]);
      setNewColTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta coleção inteira e todas as suas anotações?')) {
        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/collections`, id));
            setCollections(collections.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    }
  }

  const mainCollection = collections.length > 0 ? collections[0] : null;
  const otherCollections = collections.slice(1);

  const today = new Date();
  const dateString = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  return (
    <div className="font-body text-on-surface selection:bg-secondary-container">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f9f9f7] dark:bg-stone-900 border-b border-outline-variant/10">
        <div className="relative flex items-center justify-center w-full px-6 py-4">
          <div className="absolute left-6 flex items-center gap-4">
            <span className="material-symbols-outlined text-black dark:text-stone-100 hover:opacity-70 transition-opacity cursor-pointer active:scale-95 duration-200">menu</span>
          </div>

          <h1 className="font-headline text-xl italic tracking-tight text-primary dark:text-stone-100">{dateString.charAt(0).toUpperCase() + dateString.slice(1)}</h1>

          <div className="absolute right-6 flex items-center gap-4 md:gap-6">
            <button className="active:scale-95 duration-200 hover:opacity-70 transition-opacity flex items-center group relative">
              <span className="material-symbols-outlined text-black dark:text-stone-100">search</span>
            </button>
            <button onClick={logout} className="active:scale-95 duration-200 hover:opacity-70 transition-opacity flex items-center group relative">
              <span className="material-symbols-outlined text-black dark:text-stone-100">logout</span>
              <span className="absolute -bottom-6 right-0 text-[8px] uppercase tracking-widest text-black dark:text-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-32 dot-grid min-h-screen">
        {/* Hero Section / Editorial Title */}
        <section className="mb-16">
          <p className="font-label text-[0.75rem] uppercase tracking-[0.2em] text-outline mb-4">Biblioteca</p>
          <h2 className="font-headline italic font-semibold text-4xl md:text-5xl text-primary leading-tight">Coleções</h2>
          <div className="w-12 h-[2px] bg-[#a67c52] mt-1"></div>
        </section>
        
        {/* New Collection Form */}
        {isAdding && (
          <section className="mb-12 bg-white p-8 border border-outline-variant/30 relative">
             <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="absolute top-4 right-4 text-outline hover:text-primary material-symbols-outlined"
              >
                close
              </button>
              <h3 className="font-headline italic text-2xl mb-6 text-primary">Novo Arquivo</h3>
              <form onSubmit={handleAddCollection} className="space-y-6">
                 <div>
                   <input 
                    autoFocus
                    type="text" 
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    placeholder="Título da Coleção..." 
                    className="w-full bg-transparent border-0 border-b border-primary focus:ring-0 px-0 py-2 font-body text-xl italic placeholder:text-outline-variant"
                  />
                 </div>
                 <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-3">Ícone Mnemônico</p>
                    <div className="flex gap-4 flex-wrap">
                        {icons.map(icon => (
                            <button 
                                key={icon} 
                                type="button" 
                                onClick={() => setNewColIcon(icon)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${newColIcon === icon ? 'bg-primary text-white border-primary' : 'bg-transparent text-outline-variant border-outline-variant hover:text-primary'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                            </button>
                        ))}
                    </div>
                 </div>
                 <button type="submit" className="font-label text-xs uppercase tracking-widest hover:opacity-70 text-primary border-b border-primary pb-0.5 mt-4">
                   Criar Arquivo
                 </button>
              </form>
          </section>
        )}

        {/* Minimalist Search Bar */}
        {!isAdding && (
          <section className="mb-16">
            <div className="relative group">
              <input className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 px-0 py-4 font-body text-xl placeholder:text-outline-variant/60 transition-colors" placeholder="Buscar arquivos..." type="text"/>
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <span className="material-symbols-outlined text-outline-variant">filter_list</span>
              </div>
            </div>
          </section>
        )}
        
        {loading && <p className="font-body text-sm text-outline italic">Consultando biblioteca...</p>}
        {!loading && collections.length === 0 && !isAdding && (
          <div className="mt-8 flex flex-col items-start gap-6">
             <p className="font-headline italic text-xl text-outline-variant">A biblioteca está vazia. Comece a catalogar criando sua primeira coleção.</p>
             <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 font-label text-[0.7rem] uppercase tracking-widest text-primary border-b border-primary pb-1 hover:opacity-60 transition-opacity">
                <span className="material-symbols-outlined text-sm">add</span> Novo Arquivo
             </button>
          </div>
        )}

        {/* Collections Bento/List Hybrid */}
        {collections.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-12 gap-12 mt-12">
            {/* Featured Collection Card */}
            {mainCollection && (
                <div onClick={() => navigate(`/collections/${mainCollection.id}`)} className="md:col-span-8 group relative cursor-pointer" title="Feature Collection">
                    <div className="aspect-[16/9] mb-6 overflow-hidden bg-surface-container-low relative">
                        <button onClick={(e) => handleDelete(e, mainCollection.id)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-white drop-shadow-md flex items-center justify-center rounded-full text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                        <img className="w-full h-full object-cover grayscale opacity-90 group-hover:scale-105 transition-transform duration-700" alt="close-up of notebook" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIoganEDFES6JCefgs0zORYUMlO12eQoOUqUN885TWvQkM46CJ2aG1Ej1zyFo2UqSZu-qZzWgECGJcNJ3DewSf4YsVG1hKq7RNIfPq8CWu0GxnJYggHSikjEuaJb14isU4HXmjRBekDL07lNsHM8as9yntsiVjYIp1-O5BFOGnmwDePyfH1_wU7vfSaILppMGADBXFA5qlpfXJKahIQgkKc9C7f1eDKaNSMa51bsPw-SJ8cZKwvaUw8X6Zkb0kAhY2uoAnTrqadQo"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent mix-blend-multiply pointer-events-none"></div>
                    </div>
                    <div className="flex justify-between items-end">
                    <div>
                        <span className="material-symbols-outlined text-primary mb-2">{mainCollection.icon}</span>
                        <h3 className="font-headline text-3xl italic">{mainCollection.title}</h3>
                        <p className="font-body text-on-surface-variant text-sm mt-1">{mainCollection.entriesCount} entradas • Criado recentemente</p>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors cursor-pointer">arrow_outward</span>
                    </div>
                </div>
            )}
            
            {/* Side Collections Column */}
            <div className="md:col-span-4 flex flex-col gap-12">
                {otherCollections.map(col => (
                    <div key={col.id} onClick={() => navigate(`/collections/${col.id}`)} className="group relative cursor-pointer hover:bg-outline-variant/5 transition-colors p-2 -ml-2 rounded-lg">
                        <button onClick={(e) => handleDelete(e, col.id)} className="absolute right-2 top-2 z-10 text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                        <div className="h-[1px] w-full bg-outline-variant/20 mb-6"></div>
                        <div className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-on-surface-variant mt-1">{col.icon}</span>
                            <div>
                            <h4 className="font-headline text-2xl italic">{col.title}</h4>
                            <p className="font-body text-xs uppercase tracking-widest text-outline mt-2">{col.entriesCount} entradas</p>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Add New CTA */}
                {!isAdding && (
                    <div className="mt-4">
                        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 font-label text-[0.7rem] uppercase tracking-widest text-primary border-b border-primary pb-1 hover:opacity-60 transition-opacity">
                            <span className="material-symbols-outlined text-sm">add</span> Novo Arquivo
                        </button>
                    </div>
                )}
            </div>
            </section>
        )}
        
        {/* Bottom Spacing for Settings Peek */}
        <section className="mt-32 pt-16 border-t border-outline-variant/10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-xs">
              <h5 className="font-headline text-3xl italic mb-4">Espaço e Armazenamento</h5>
              <p className="font-body text-on-surface-variant text-sm leading-relaxed">Seu santuário digital está seguro. A sincronização na nuvem está ativa com o seu endereço atual conectado.</p>
            </div>
            <div className="grid grid-cols-2 gap-8 w-full md:w-auto">
              <div>
                <p className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-outline mb-3">Tipografia</p>
                <p className="font-headline text-xl italic">Newsreader</p>
              </div>
              <div>
                <p className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-outline mb-3">Tema</p>
                <p className="font-headline text-xl italic">Papel Branco</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      
      
      {/* Visual Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100]" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCviViKpcBedZM-ANSYScpbt3Ztsco4PFo4KXq0_rkh0aLta712TWCD0_WImHZWjh6WvYcUMQL_Zw2KfTvUGLwDbgbQzfQyKrkplLjNa5ChhRuhjbWZtof9fFKf25rI7kpH9vv-f5lIg8RcmeTpoA6TL9fktaAgrBapSw49-SHuZIcEaNuV2dCR7w2EnHJBMeKSo7SehEzLC7_fIplKuNXx5cCjPlfNTn-1WwVq9NinAEpqTLU5NLNqKJPm_01isF8u7UAxLrV2rCo')"}}></div>
    </div>
  );
}
