import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import AddExpense from './pages/AddExpense';
import EditExpense from './pages/EditExpense';
import Activity from './pages/Activity';
import Account from './pages/Account';
import GroupDetailsPage from './pages/GroupDetails';
import InviteJoinPage from './pages/InviteJoinPage';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';

const ProtectedRoute = () => {
  const { currentUser, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicRoute = () => {
  const { currentUser, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      
      <Route path="/join/:groupId" element={<InviteJoinPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupDetailsPage />} />
          <Route path="activity" element={<Activity />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="/edit-expense/:id" element={<EditExpense />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <PwaUpdateBanner />
        <Router>
          <AppRoutes />
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
