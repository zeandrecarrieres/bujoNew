import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const nameRef = useRef();
  const { login, signup } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!emailRef.current.value || !passwordRef.current.value) {
      return setError('Preencha os dados.');
    }
    
    try {
      setError('');
      setLoading(true);
      if (isLogin) {
        await login(emailRef.current.value, passwordRef.current.value);
      } else {
        if (!nameRef.current.value) {
            return setError('Digite o seu nome.');
        }
        await signup(emailRef.current.value, passwordRef.current.value, nameRef.current.value);
      }
      navigate('/');
    } catch (err) {
      setError('Falha ao autenticar.');
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="font-body text-on-surface bg-[#f9f9f7] min-h-screen flex items-center justify-center selection:bg-secondary-container p-6 relative">
      {/* Background Dot Grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none z-0"></div>

      <div className="w-full max-w-md bg-surface-container-lowest p-12 shadow-[0_20px_40px_rgba(0,0,0,0.04)] relative z-10 border-t-4 border-primary">
        <div className="mb-10 text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-4" style={{fontVariationSettings: "'FILL' 0, 'wght' 200"}}>menu_book</span>
            <h1 className="font-headline text-5xl italic text-primary leading-tight mb-2">bujo.</h1>
            <p className="font-label text-xs uppercase tracking-[0.2em] text-outline">O Diário Digitalista</p>
        </div>

        {error && (
            <div className="mb-6 p-4 border-l-2 border-red-500 bg-red-50 text-red-800 text-sm font-body italic">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 flex flex-col">
          {!isLogin && (
            <div className="relative group">
              <label className="font-label text-[10px] uppercase tracking-widest text-outline absolute -top-4 left-0 transition-opacity">Nome de Autor</label>
              <input 
                type="text" 
                ref={nameRef}
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 px-0 py-2 font-body text-lg placeholder:text-outline-variant/60 transition-colors" 
                placeholder="Seu nome completo" 
              />
            </div>
          )}
          
          <div className="relative group">
            <label className="font-label text-[10px] uppercase tracking-widest text-outline absolute -top-4 left-0 transition-opacity">Correspondência</label>
            <input 
              type="email" 
              ref={emailRef} 
              required
              className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 px-0 py-2 font-body text-lg placeholder:text-outline-variant/60 transition-colors" 
              placeholder="seu@endereço.com" 
            />
          </div>

          <div className="relative group">
            <label className="font-label text-[10px] uppercase tracking-widest text-outline absolute -top-4 left-0 transition-opacity">Segredo</label>
            <input 
              type="password" 
              ref={passwordRef}
              required
              className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 px-0 py-2 font-body text-lg placeholder:text-outline-variant/60 transition-colors" 
              placeholder="Sua senha" 
            />
          </div>

          <button 
            disabled={loading} 
            className="mt-4 w-full bg-primary text-on-primary font-headline text-xl italic py-4 hover:opacity-80 transition-opacity active:scale-95 duration-200"
          >
            {isLogin ? 'Abrir Diário' : 'Começar a Escrever'}
          </button>
        </form>

        <div className="mt-8 text-center">
            <button 
               onClick={() => setIsLogin(!isLogin)}
               className="font-body text-sm text-secondary hover:text-primary underline decoration-outline-variant/50 hover:decoration-primary/50 transition-colors italic"
            >
               {isLogin ? 'Ou crie um novo diário' : 'Já tem um diário? Entre aqui'}
            </button>
        </div>
      </div>
    </div>
  );
}
