import { Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import UserDetail from '../pages/UserDetail';
import Payments from '../pages/Payments';
import CreatePaymentLink from '../pages/CreatePaymentLink';
import Characters from '../pages/Characters';
import Equipment from '../pages/Equipment';
import AdventureCards from '../pages/AdventureCards';
import Maps from '../pages/Maps';
import Localization from '../pages/Localization';
import Themes from '../pages/Themes';
import Logs from '../pages/Logs';
import About from '../pages/About';
import ManagerAssets from '../pages/ManagerAssets';
import ServerConfigurationVersions from '../pages/ServerConfigurationVersions';
import AIManage from '../pages/AIManage';
import DatabaseManagement from '../pages/DatabaseManagement';
import CalculateMovement from '../pages/CalculateMovement';

/** Shared child routes for `/` and `/mobile` layouts. */
export function renderAppRoutes() {
  return [
    <Route key="index" index element={<Dashboard />} />,
    <Route key="users" path="users" element={<Users />} />,
    <Route key="users-id" path="users/:id" element={<UserDetail />} />,
    <Route key="payments" path="payments" element={<Payments />} />,
    <Route key="payment-link" path="payment-link" element={<CreatePaymentLink />} />,
    <Route key="payment-link-uid" path="payment-link/:userId" element={<CreatePaymentLink />} />,
    <Route key="characters" path="characters" element={<Characters />} />,
    <Route key="equipment" path="equipment" element={<Equipment />} />,
    <Route key="adventure-cards" path="adventure-cards" element={<AdventureCards />} />,
    <Route key="maps" path="maps" element={<Maps />} />,
    <Route key="localization" path="localization" element={<Localization />} />,
    <Route key="themes" path="themes" element={<Themes />} />,
    <Route key="manager-assets" path="manager-assets" element={<ManagerAssets />} />,
    <Route key="server-configuration-versions" path="server-configuration-versions" element={<ServerConfigurationVersions />} />,
    <Route key="logs" path="logs" element={<Logs />} />,
    <Route key="calculate-movement" path="calculate-movement" element={<CalculateMovement />} />,
    <Route key="ai-manage" path="ai-manage" element={<AIManage />} />,
    <Route key="database-management" path="database-management" element={<DatabaseManagement />} />,
    <Route key="about" path="about" element={<About />} />,
  ];
}
