import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header style={{ padding: 12, borderBottom: '1px solid #eee', marginBottom: 12 }}>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link to="/Home">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/booking">Booking</Link>
        <Link to="/my-bookings">My Bookings</Link>
        <Link to="/driver">Driver</Link>
        <Link to="/admin">Admin</Link>
      </nav>
    </header>
  );
}
