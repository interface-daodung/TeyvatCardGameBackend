import { Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Payments from './pages/Payments';
import UserPayments from './pages/UserPayments';
import TestPayos from './pages/TestPayos';
import Characters from './pages/Characters';
import Equipment from './pages/Equipment';
import AdventureCards from './pages/AdventureCards';
import Maps from './pages/Maps';
import Localization from './pages/Localization';
import Logs from './pages/Logs';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/user/:id/Payments"
        element={
          <PrivateRoute>
            <UserPayments />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="test-payos" element={<TestPayos />} />
        <Route path="characters" element={<Characters />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="adventure-cards" element={<AdventureCards />} />
        <Route path="maps" element={<Maps />} />
        <Route path="localization" element={<Localization />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}

export default App;
