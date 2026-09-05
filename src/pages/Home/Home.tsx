import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface User {
  fullName: string;
  email: string;
  profileImage?: string;
  mobile?: string;
}

const navItems = [
  { label: 'Home', to: '/Home', icon: '🏠' },
  { label: 'Login', to: '/login', icon: '🔐' },
  { label: 'Booking', to: '/booking', icon: '📍' },
  { label: 'My Bookings', to: '/my-bookings', icon: '🧾' },
  { label: 'Driver', to: '/driver', icon: '🛵' },
  { label: 'Admin', to: '/admin', icon: '⚙️' },
];

const fallbackScooterImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <rect width="900" height="600" fill="#0f172a"/>
  <circle cx="240" cy="430" r="68" fill="#38bdf8"/>
  <circle cx="665" cy="430" r="68" fill="#38bdf8"/>
  <rect x="180" y="260" width="380" height="105" rx="28" fill="#7dd3fc"/>
  <rect x="340" y="165" width="145" height="120" rx="24" fill="#e2e8f0"/>
  <path d="M315 270 L360 190 H470 L560 270" fill="none" stroke="#f8fafc" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="450" y="520" text-anchor="middle" font-size="64" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">Scooty</text>
</svg>
`)}`;

const vehicles = [
  {
    name: 'Bike',
    price: '₹10/km',
    image:
      'https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80',
    accent: '#f59e0b',
    description: 'Fast, compact, and ideal for city rides.',
  },
  {
    name: 'Bike',
    price: '₹10/km',
    image:
      'https://images.pexels.com/photos/2393816/pexels-photo-2393816.jpeg?auto=compress&cs=tinysrgb&w=900',
    accent: '#0ea5e9',
    description: 'Easy to drive and perfect for quick trips.',
  },
];

function normalizeUser(raw: any): User {
  if (!raw) throw new Error('No raw user');
  return {
    fullName: raw.fullName || raw.name || '',
    email: raw.email || '',
    profileImage: raw.profileImage || raw.avatar || undefined,
    mobile: raw.mobile ?? raw.phone ?? undefined,
  };
}

const getStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('jaldiJanaUser');
    if (!storedUser) {
      return null;
    }

    const parsedRaw = JSON.parse(storedUser) as any;
    const parsed = parsedRaw?.fullName ? (parsedRaw as User) : null;
    if (!parsed) return null;
    // ensure mobile normalization if stored object used an alternate key
    if (!parsed.mobile && (parsedRaw.phone || parsedRaw.mobile)) {
      const normalized = normalizeUser(parsedRaw);
      localStorage.setItem('jaldiJanaUser', JSON.stringify(normalized));
      return normalized;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to read stored user', error);
    return null;
  }
};

export default function Home() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const navigate = useNavigate();

  const handleVehicleSelect = () => {
    if (user) {
      navigate('/booking');
      return;
    }

    navigate('/login');
  };

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      return;
    }

    fetch('https://common-oauth-service.onrender.com/api/auth/me', {
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        return response.json();
      })
      .then((data) => {
        if (data?.fullName) {
          try {
            const normalized = normalizeUser(data);
            setUser(normalized);
            localStorage.setItem('jaldiJanaUser', JSON.stringify(normalized));
          } catch (e) {
            setUser(data);
            localStorage.setItem('jaldiJanaUser', JSON.stringify(data));
          }
        }
      })
      .catch((error) => {
        console.error(error);
        setUser(null);
      });
  }, []);

  return (
    <div className="home-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">J</div>
          <div>
            <p className="eyebrow">Ride Smart</p>
            <h2>Jaldi Jana</h2>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="profile-card">
          {user ? (
            <>
              <img
                src={user.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullName)}
                alt={user.fullName}
                className="profile-image"
              />
              <div>
                <strong>{user.fullName}</strong>
                {/* <!--small>{user.email}<small> */}
              </div>
            </>
          ) : (
            <>
              <div className="guest-badge">👤</div>
              <div>
                <strong>Guest</strong>
                <small>
                  <a href="/login">Login here</a>
                </small>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="home-main">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow accent">Fast rides. Smart pricing.</p>
            <h1>Move around the city with ease.</h1>
            <p className="hero-text">
              Choose your ideal ride, book in seconds, and enjoy clear pricing with every trip.
            </p>

            <div className="stats-row">
              <div>
                <strong>4.9/5</strong>
                <span>Customer rating</span>
              </div>
              <div>
                <strong>3 min</strong>
                <span>Avg. pickup</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Support</span>
              </div>
            </div>
          </div>

          <div className="vehicle-showcase">
            {vehicles.map((vehicle) => (
              <article
                key={vehicle.name}
                className="vehicle-card"
                style={{ borderColor: vehicle.accent, cursor: 'pointer' }}
                onClick={handleVehicleSelect}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleVehicleSelect();
                  }
                }}
              >
                <div className="vehicle-badge" style={{ background: vehicle.accent }}>
                  {vehicle.name}
                </div>
                <img
                  src={vehicle.image}
                  alt={vehicle.name}
                  className="vehicle-image"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleVehicleSelect();
                  }}
                  onError={(event) => {
                    if (vehicle.name === 'Scooty') {
                      event.currentTarget.src = fallbackScooterImage;
                    }
                  }}
                />
                <div className="vehicle-meta">
                  <div>
                    <h3>{vehicle.name}</h3>
                    <p>{vehicle.description}</p>
                  </div>
                  <span className="price-tag">{vehicle.price}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
