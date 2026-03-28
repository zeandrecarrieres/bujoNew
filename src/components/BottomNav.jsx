import React from 'react';
import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-4 bg-[#f9f9f7]/90 dark:bg-[#1a1c1b]/90 backdrop-blur-xl shadow-[0_-10px_30px_rgba(26,28,27,0.04)] border-t border-black/5 dark:border-white/5">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center justify-center pt-2 transition-all active:scale-90 duration-300 ease-in-out h-full border-t-2 ${isActive ? 'text-black dark:text-white border-black dark:border-white' : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white border-transparent'}`}
        end
      >
        <span className="material-symbols-outlined mb-0.5">edit_note</span>
        <span className="font-sans uppercase tracking-[0.1rem] text-[10px] hidden sm:block">Diário</span>
      </NavLink>
      <NavLink 
        to="/weekly" 
        className={({ isActive }) => `flex flex-col items-center justify-center pt-2 transition-all active:scale-90 duration-300 ease-in-out h-full border-t-2 ${isActive ? 'text-black dark:text-white border-black dark:border-white' : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white border-transparent'}`}
      >
        <span className="material-symbols-outlined mb-0.5">view_week</span>
        <span className="font-sans uppercase tracking-[0.1rem] text-[10px] hidden sm:block">Semana</span>
      </NavLink>
      <NavLink 
        to="/monthly" 
        className={({ isActive }) => `flex flex-col items-center justify-center pt-2 transition-all active:scale-90 duration-300 ease-in-out h-full border-t-2 ${isActive ? 'text-black dark:text-white border-black dark:border-white' : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white border-transparent'}`}
      >
        <span className="material-symbols-outlined mb-0.5">calendar_month</span>
        <span className="font-sans uppercase tracking-[0.1rem] text-[10px] hidden sm:block">Mês</span>
      </NavLink>
      <NavLink 
        to="/future" 
        className={({ isActive }) => `flex flex-col items-center justify-center pt-2 transition-all active:scale-90 duration-300 ease-in-out h-full border-t-2 ${isActive ? 'text-black dark:text-white border-black dark:border-white' : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white border-transparent'}`}
      >
        <span className="material-symbols-outlined mb-0.5">upcoming</span>
        <span className="font-sans uppercase tracking-[0.1rem] text-[10px] hidden sm:block">Futuro</span>
      </NavLink>
      <NavLink 
        to="/habits" 
        className={({ isActive }) => `flex flex-col items-center justify-center pt-2 transition-all active:scale-90 duration-300 ease-in-out h-full border-t-2 ${isActive ? 'text-black dark:text-white border-black dark:border-white' : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white border-transparent'}`}
      >
        <span className="material-symbols-outlined mb-0.5">check_circle</span>
        <span className="font-sans uppercase tracking-[0.1rem] text-[10px] hidden sm:block">Hábitos</span>
      </NavLink>
      <NavLink 
        to="/collections" 
        className={({ isActive }) => `flex flex-col items-center justify-center pt-2 transition-all active:scale-90 duration-300 ease-in-out h-full border-t-2 ${isActive ? 'text-black dark:text-white border-black dark:border-white' : 'text-stone-400 dark:text-stone-500 hover:text-black dark:hover:text-white border-transparent'}`}
      >
        <span className="material-symbols-outlined mb-0.5">auto_stories</span>
        <span className="font-sans uppercase tracking-[0.1rem] text-[10px] hidden sm:block">Acervo</span>
      </NavLink>
    </nav>
  );
}
