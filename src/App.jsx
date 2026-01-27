import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Search from './pages/Search';
import Guestlists from './pages/Guestlists';
import Profile from './pages/Profile';
import CreateList from './pages/CreateList';
import PreviewGuestlist from './pages/PreviewGuestlist';
import EventDetails from './pages/EventDetails';
import Rsvp from './pages/Rsvp';
import ViewGuests from './pages/ViewGuests';
import EditProfile from './pages/EditProfile';
import Friends from './pages/Friends';
import Notifications from './pages/Notifications';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';
import BottomNav from './components/BottomNav';

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="screen center-msg">Loading App...</div>;

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/lists" element={<Guestlists />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/create" element={<CreateList />} />
        <Route path="/preview" element={<PreviewGuestlist />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/rsvp/:id" element={<Rsvp />} />
        <Route path="/manage/:id" element={<ViewGuests />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
