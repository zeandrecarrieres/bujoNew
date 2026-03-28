import { Outlet } from 'react-router-dom';
import BottomNav from './components/BottomNav';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-16"> {/* Add padding for the fixed bottom nav */}
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
