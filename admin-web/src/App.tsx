import { Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Payments from './pages/Payments';
import CreatePaymentLink from './pages/CreatePaymentLink';
import Characters from './pages/Characters';
import CharacterDetail from './pages/CharacterDetail';
import Equipment from './pages/Equipment';
import AdventureCards from './pages/AdventureCards';
import Maps from './pages/Maps';
import Localization from './pages/Localization';
import Logs from './pages/Logs';
import Themes from './pages/Themes';
import About from './pages/About';
import ManagerAssets from './pages/ManagerAssets';
import Layout from './components/layout';

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
        <Route path="payment-link" element={<CreatePaymentLink />} />
        <Route path="characters" element={<Characters />} />
        <Route path="characters/:id" element={<CharacterDetail />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="adventure-cards" element={<AdventureCards />} />
        <Route path="maps" element={<Maps />} />
        <Route path="localization" element={<Localization />} />
        <Route path="themes" element={<Themes />} />
        <Route path="manager-assets" element={<ManagerAssets />} />
        <Route path="logs" element={<Logs />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;
