import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { firstAssignedRoute } from '../lib/routeAccess';

const Dashboard = () => {
  const { user } = useAuth();
  return <Navigate to={firstAssignedRoute(user)} replace />;
};

export default Dashboard;
