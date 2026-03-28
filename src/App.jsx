import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Today from './pages/Today';
import Weekly from './pages/Weekly';
import Monthly from './pages/Monthly';
import HabitTracker from './pages/HabitTracker';
import Collections from './pages/Collections';
import CollectionDetail from './pages/CollectionDetail';
import Future from './pages/Future';
import Directions from './pages/Directions';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Today />} />
            <Route path="weekly" element={<Weekly />} />
            <Route path="monthly" element={<Monthly />} />
            <Route path="habits" element={<HabitTracker />} />
            <Route path="collections" element={<Collections />} />
            <Route path="collections/:id" element={<CollectionDetail />} />
            <Route path="future" element={<Future />} />
            <Route path="direcoes" element={<Directions />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
