import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import CourseDetail from './pages/CourseDetail.tsx';
import UnitDetail from './pages/UnitDetail.tsx';
import Users from './pages/Users.tsx';
import UserDetail from './pages/UserDetail.tsx';
import Login from './pages/Login.tsx';
import authService from './services/authService';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const user = authService.getCurrentUser();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div className="admin-container">
                <aside className="sidebar">
                  <div className="logo">LUMINA ADMIN</div>
                  <nav>
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      Dersler
                    </NavLink>
                    <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      Kullanıcılar
                    </NavLink>
                  </nav>
                  
                  <div style={{ marginTop: 'auto', padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      {user?.firstName} {user?.lastName}
                    </div>
                    <button onClick={handleLogout} className="btn btn-primary" style={{ width: '100%' }}>
                      Çıkış Yap
                    </button>
                  </div>
                </aside>

                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/course/:id" element={<CourseDetail />} />
                    <Route path="/unit/:id" element={<UnitDetail />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/:id" element={<UserDetail />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
