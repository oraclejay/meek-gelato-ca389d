import { Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';

import Home from './pages/Home/Home';
import LoginPage from './pages/Login/Login';
import BookingPage from './pages/Booking/Booking';
import MyBookingsPage from './pages/MyBookings/MyBookings';
import DriverDashboard from './pages/DriverDashboard/DriverDashboard';
import AdminDashboardPage from './pages/AdminDashboard/AdminDashboard';

export default function App() {
  return (
    <>
     

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </>
  );
}
