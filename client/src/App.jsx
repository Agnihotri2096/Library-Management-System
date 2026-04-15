import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing           from './pages/Landing';
import StudentLogin      from './pages/student/Login';
import StudentRegister   from './pages/student/Register';
import StudentDashboard  from './pages/student/Dashboard';
import StudentIDCard     from './pages/student/IDCard';
import LibrarianLogin    from './pages/librarian/Login';
import LibrarianDash     from './pages/librarian/Dashboard';
import Scan              from './pages/librarian/Scan';
import ReturnBook        from './pages/librarian/Return';
import Students          from './pages/librarian/Students';
import Books             from './pages/librarian/Books';

function GuardStudent({ children }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn || user?.role !== 'student') return <Navigate to="/student/login" replace />;
  return children;
}
function GuardLibrarian({ children }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn || user?.role !== 'librarian') return <Navigate to="/librarian/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<Landing />} />

          {/* Student */}
          <Route path="/student/login"     element={<StudentLogin />} />
          <Route path="/student/register"  element={<StudentRegister />} />
          <Route path="/student/dashboard" element={<GuardStudent><StudentDashboard /></GuardStudent>} />
          <Route path="/student/id-card"   element={<GuardStudent><StudentIDCard /></GuardStudent>} />

          {/* Librarian */}
          <Route path="/librarian/login"     element={<LibrarianLogin />} />
          <Route path="/librarian/dashboard" element={<GuardLibrarian><LibrarianDash /></GuardLibrarian>} />
          <Route path="/librarian/scan"      element={<GuardLibrarian><Scan /></GuardLibrarian>} />
          <Route path="/librarian/return"    element={<GuardLibrarian><ReturnBook /></GuardLibrarian>} />
          <Route path="/librarian/students"  element={<GuardLibrarian><Students /></GuardLibrarian>} />
          <Route path="/librarian/books"     element={<GuardLibrarian><Books /></GuardLibrarian>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
