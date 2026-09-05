import { useMemo, useState } from 'react';
import './AdminDashboard.css';

type Bike = {
  id: string;
  model: string;
  plate: string;
  status: 'available' | 'on-trip' | 'maintenance' | 'offline';
  ratePerKm: number;
};

type Driver = {
  id: string;
  name: string;
  phone?: string;
  vehiclePlate?: string;
  active?: boolean;
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<'bikes' | 'drivers' | 'users' | 'bookings' | 'payments'>('bikes');

  const [bikes, setBikes] = useState<Bike[]>([
    { id: 'b1', model: 'Hero Splendor', plate: 'TN01AB1234', status: 'available', ratePerKm: 10 },
    { id: 'b2', model: 'TVS Apache', plate: 'TN01AB5678', status: 'on-trip', ratePerKm: 12 },
  ]);

  const [drivers, setDrivers] = useState<Driver[]>([
    { id: 'd1', name: 'Kumar', phone: '9876543210', vehiclePlate: 'TN01AB1234', active: true },
    { id: 'd2', name: 'Priya', phone: '9123456780', vehiclePlate: 'TN01AB5678', active: true },
  ]);

  // users
  type User = {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    password_hash?: string;
    profile_image?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    date_of_birth?: string; // ISO date
    role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
    status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'SUSPENDED';
    actual_image?: string; // base64 data URL
    profile_image_type?: string; // 'jpg' | 'png'
  };

  const [users, setUsers] = useState<User[]>([
    { id: 'u1', full_name: 'Arjun Sharma', email: 'arjun@example.com', phone: '9000000001', role: 'CUSTOMER', status: 'ACTIVE' },
    { id: 'u2', full_name: 'Admin User', email: 'admin@example.com', phone: '9000000002', role: 'ADMIN', status: 'ACTIVE' },
  ]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ full_name: '', email: '', phone: '', password_hash: '', profile_image: '', actual_image: '', profile_image_type: '', gender: 'MALE', date_of_birth: '', role: 'CUSTOMER', status: 'ACTIVE' } as any);
  const [userSearch, setUserSearch] = useState({ phone: '', email: '', full_name: '' });

  function startEditUser(u?: User) {
    if (u) {
      setEditingUser(u);
      setUserForm({ full_name: u.full_name, email: u.email || '', phone: u.phone || '', password_hash: u.password_hash || '', profile_image: u.profile_image || '', actual_image: u.actual_image || '', profile_image_type: u.profile_image_type || '', gender: u.gender || 'MALE', date_of_birth: u.date_of_birth || '', role: u.role || 'CUSTOMER', status: u.status || 'ACTIVE' });
    } else {
      setEditingUser(null);
      setUserForm({ full_name: '', email: '', phone: '', password_hash: '', profile_image: '', actual_image: '', profile_image_type: '', gender: 'MALE', date_of_birth: '', role: 'CUSTOMER', status: 'ACTIVE' });
    }
  }

  async function saveUser(e?: React.FormEvent) {
    e?.preventDefault();

    // prepare payload expected by backend
    const toBase64 = (dataUrl: string | undefined) => {
      if (!dataUrl) return '';
      const idx = dataUrl.indexOf(',');
      return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
    };

    const actualBase64 = toBase64(userForm.actual_image);
    // determine profileImageType (e.g. image/jpeg or jpg)
    let profileImageType = userForm.profile_image_type || '';
    if (!profileImageType && userForm.actual_image) {
      const m = (userForm.actual_image as string).match(/^data:([^;]+);base64,/);
      if (m) profileImageType = m[1];
    }

    const payload = {
      fullName: userForm.full_name,
      email: userForm.email || null,
      phone: userForm.phone || null,
      passwordHash: userForm.password_hash || null,
      profileImage: userForm.profile_image || null,
      actualImage: actualBase64 || null,
      profileImageType: profileImageType || null,
      gender: userForm.gender || null,
      dateOfBirth: userForm.date_of_birth || null,
      role: userForm.role || 'CUSTOMER',
      status: userForm.status || 'ACTIVE',
    };

    const payloadActualImage = typeof payload.actualImage === 'string' ? payload.actualImage : '';

    try {
      const res = await fetch('https://village-bike-travel-service.onrender.com/api/user/newuser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Save user failed:', res.status, text);
        alert('Failed to save user');
        return;
      }

      const data = await res.json();
      // map backend response into local shape and update list
      const serverActualImage = typeof data?.actualImage === 'string'
        ? data.actualImage
        : Array.isArray(data?.actualImage)
          ? data.actualImage.join('')
          : '';

      const mapped = {
        id: data?.userId || data?.user_id || `u${Date.now()}`,
        full_name: data?.fullName || payload.fullName,
        email: data?.email || payload.email,
        phone: data?.phone || payload.phone,
        password_hash: data?.passwordHash || payload.passwordHash,
        profile_image: data?.profileImage || payload.profileImage,
        actual_image: serverActualImage
          ? `data:${data?.profileImageType || profileImageType || 'image/jpeg'};base64,${serverActualImage}`
          : (payloadActualImage ? `data:${profileImageType || 'image/jpeg'};base64,${payloadActualImage}` : ''),
        profile_image_type: data?.profileImageType || profileImageType,
        gender: data?.gender || payload.gender,
        date_of_birth: data?.dateOfBirth || payload.dateOfBirth,
        role: data?.role || payload.role,
        status: data?.status || payload.status,
      } as User;

      setUsers((prev) => {
        const exists = prev.find((p) => p.id === mapped.id || (editingUser && p.id === editingUser.id));
        if (exists) {
          return prev.map((p) => (p.id === mapped.id || (editingUser && p.id === editingUser.id) ? mapped : p));
        }
        return [mapped, ...prev];
      });

      setEditingUser(mapped);
      setUserForm((f: any) => ({ ...f, actual_image: mapped.actual_image, profile_image_type: mapped.profile_image_type }));
      if (res.status === 201) {
        alert('user have been successfully saved');
      } else {
        alert('User saved successfully');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving user');
    }
  }

  function deleteUser(id: string) {
    if (!confirm('Delete this user?')) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function findUser() {
    const { phone, email, full_name } = userSearch;
    try {
      if (phone) {
        const res = await fetch(`https://village-bike-travel-service.onrender.com/api/user/findbyphone/${encodeURIComponent(phone)}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        mapResponseToForm(data);
        return;
      }

      if (email) {
        const res = await fetch(`https://village-bike-travel-service.onrender.com/api/user/findbyemail?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        mapResponseToForm(data);
        return;
      }

      if (full_name) {
        const found = users.find((u) => u.full_name.toLowerCase().includes(full_name.toLowerCase()));
        if (found) {
          startEditUser(found);
        } else {
          alert('User not found');
        }
        return;
      }

      alert('Enter phone, email, or name to search');
    } catch (err) {
      console.error(err);
      alert('User not found or server error');
    }
  }

  function mapResponseToForm(data: any) {
    // backend returns camelCase fields; map to local form
    const actual = data?.actualImage;
    const profileType = data?.profileImageType || '';
    const dataUrl = actual ? `data:${profileType || 'image/jpeg'};base64,${actual}` : '';

    const mapped: User = {
      id: data?.userId || data?.user_id || `u${Date.now()}`,
      full_name: data?.fullName || data?.full_name || '',
      email: data?.email,
      phone: data?.phone,
      password_hash: data?.passwordHash || data?.password_hash,
      profile_image: data?.profileImage || '',
      actual_image: dataUrl,
      profile_image_type: profileType.includes('jpeg') ? 'jpg' : profileType.includes('png') ? 'png' : profileType,
      gender: (data?.gender || undefined) as any,
      date_of_birth: data?.dateOfBirth || data?.date_of_birth,
      role: data?.role,
      status: data?.status,
    };

    setEditingUser(mapped);
    setUserForm({
      full_name: mapped.full_name,
      email: mapped.email || '',
      phone: mapped.phone || '',
      password_hash: mapped.password_hash || '',
      profile_image: mapped.profile_image || '',
      actual_image: mapped.actual_image || '',
      profile_image_type: mapped.profile_image_type || '',
      gender: mapped.gender || 'MALE',
      date_of_birth: mapped.date_of_birth || '',
      role: mapped.role || 'CUSTOMER',
      status: mapped.status || 'ACTIVE',
    } as any);
  }

  // bookings & payments (report placeholders)
  type Booking = { id: string; customer: string; bike: string; from: string; to: string; status: 'booked' | 'completed' | 'cancelled' };
  type Payment = { id: string; bookingId: string; amount: number; method: string; date: string; status: 'success' | 'failed' };

  const [bookings] = useState<Booking[]>([
    { id: 'bk1', customer: 'Arjun Sharma', bike: 'Hero Splendor', from: 'Village Bus Stand', to: 'Main Road', status: 'booked' },
    { id: 'bk2', customer: 'Meera', bike: 'TVS Apache', from: 'Station', to: 'Market', status: 'completed' },
  ]);

  const [payments] = useState<Payment[]>([
    { id: 'p1', bookingId: 'bk1', amount: 120, method: 'UPI', date: '2026-08-25', status: 'success' },
    { id: 'p2', bookingId: 'bk2', amount: 220, method: 'Card', date: '2026-08-24', status: 'success' },
  ]);

  // bike form
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [bikeForm, setBikeForm] = useState({ model: '', plate: '', status: 'available', ratePerKm: 10 } as any);

  // driver form
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', vehiclePlate: '', active: true } as any);

  function startEditBike(b?: Bike) {
    if (b) {
      setEditingBike(b);
      setBikeForm({ model: b.model, plate: b.plate, status: b.status, ratePerKm: b.ratePerKm });
    } else {
      setEditingBike(null);
      setBikeForm({ model: '', plate: '', status: 'available', ratePerKm: 10 });
    }
  }

  function saveBike(e?: React.FormEvent) {
    e?.preventDefault();
    if (editingBike) {
      setBikes((prev) => prev.map((p) => (p.id === editingBike.id ? { ...p, ...bikeForm } : p)));
    } else {
      const newBike: Bike = { id: `b${Date.now()}`, model: bikeForm.model, plate: bikeForm.plate, status: bikeForm.status, ratePerKm: Number(bikeForm.ratePerKm) };
      setBikes((prev) => [newBike, ...prev]);
    }
    startEditBike();
  }

  function deleteBike(id: string) {
    if (!confirm('Delete this bike?')) return;
    setBikes((prev) => prev.filter((b) => b.id !== id));
  }

  function startEditDriver(d?: Driver) {
    if (d) {
      setEditingDriver(d);
      setDriverForm({ name: d.name, phone: d.phone || '', vehiclePlate: d.vehiclePlate || '', active: !!d.active });
    } else {
      setEditingDriver(null);
      setDriverForm({ name: '', phone: '', vehiclePlate: '', active: true });
    }
  }

  function saveDriver(e?: React.FormEvent) {
    e?.preventDefault();
    if (editingDriver) {
      setDrivers((prev) => prev.map((p) => (p.id === editingDriver.id ? { ...p, ...driverForm } : p)));
    } else {
      const newDriver: Driver = { id: `d${Date.now()}`, name: driverForm.name, phone: driverForm.phone, vehiclePlate: driverForm.vehiclePlate, active: !!driverForm.active };
      setDrivers((prev) => [newDriver, ...prev]);
    }
    startEditDriver();
  }

  function deleteDriver(id: string) {
    if (!confirm('Delete this driver?')) return;
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }

  const stats = useMemo(() => ({ totalBikes: bikes.length, available: bikes.filter((b) => b.status === 'available').length, onTrip: bikes.filter((b) => b.status === 'on-trip').length }), [bikes]);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>Admin Dashboard</h1>
          <a href="/" className="home-link">Home</a>
        </div>
        <div className="admin-stats">
          <div><strong>{stats.totalBikes}</strong><span>Total Bikes</span></div>
          <div><strong>{stats.available}</strong><span>Available</span></div>
          <div><strong>{stats.onTrip}</strong><span>On Trip</span></div>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-nav">
          <button className={tab === 'bikes' ? 'active' : ''} onClick={() => setTab('bikes')}>Bikes</button>
          <button className={tab === 'drivers' ? 'active' : ''} onClick={() => setTab('drivers')}>Drivers</button>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
          <hr style={{ border: 'none', height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
          <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Bookings (Report)</button>
          <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payments (Report)</button>
        </aside>

        <section className="admin-panel">
          {tab === 'bikes' && (
            <div className="panel">
              <div className="panel-header">
                <h2>Bikes</h2>
                <div className="panel-actions">
                  <button className="primary" onClick={() => startEditBike()}>Add Bike</button>
                </div>
              </div>

              <div className="list-grid">
                <div className="list-left">
                  <ul>
                    {bikes.map((b) => (
                      <li key={b.id}>
                        <div>
                          <strong>{b.model}</strong>
                          <div className="muted">{b.plate} · ₹{b.ratePerKm}/km</div>
                        </div>
                        <div className="row-actions">
                          <span className={`status ${b.status.replace(/\s+/g, '-')}`}>{b.status}</span>
                          <button onClick={() => startEditBike(b)}>Edit</button>
                          <button onClick={() => deleteBike(b.id)} className="danger">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="list-right">
                  <form onSubmit={saveBike} className="entity-form">
                    <h3>{editingBike ? 'Edit Bike' : 'Add Bike'}</h3>
                    <label>Model<input value={bikeForm.model} onChange={(e) => setBikeForm((f: any) => ({ ...f, model: e.target.value }))} required /></label>
                    <label>Plate<input value={bikeForm.plate} onChange={(e) => setBikeForm((f: any) => ({ ...f, plate: e.target.value }))} required /></label>
                    <label>Rate per km<input type="number" value={bikeForm.ratePerKm} onChange={(e) => setBikeForm((f: any) => ({ ...f, ratePerKm: e.target.value }))} /></label>
                    <label>Status<select value={bikeForm.status} onChange={(e) => setBikeForm((f: any) => ({ ...f, status: e.target.value }))}>
                      <option value="available">available</option>
                      <option value="on-trip">on-trip</option>
                      <option value="maintenance">maintenance</option>
                      <option value="offline">offline</option>
                    </select></label>

                    <div className="form-actions">
                      <button type="submit" className="primary">Save</button>
                      <button type="button" onClick={() => startEditBike()}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {tab === 'drivers' && (
            <div className="panel">
              <div className="panel-header">
                <h2>Drivers</h2>
                <div className="panel-actions">
                  <button className="primary" onClick={() => startEditDriver()}>Add Driver</button>
                </div>
              </div>

              <div className="list-grid">
                <div className="list-left">
                  <ul>
                    {drivers.map((d) => (
                      <li key={d.id}>
                        <div>
                          <strong>{d.name}</strong>
                          <div className="muted">{d.vehiclePlate} · {d.phone}</div>
                        </div>
                        <div className="row-actions">
                          <span className={`status ${d.active ? 'active' : 'inactive'}`}>{d.active ? 'active' : 'inactive'}</span>
                          <button onClick={() => startEditDriver(d)}>Edit</button>
                          <button onClick={() => deleteDriver(d.id)} className="danger">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="list-right">
                  <form onSubmit={saveDriver} className="entity-form">
                    <h3>{editingDriver ? 'Edit Driver' : 'Add Driver'}</h3>
                    <label>Name<input value={driverForm.name} onChange={(e) => setDriverForm((f: any) => ({ ...f, name: e.target.value }))} required /></label>
                    <label>Phone<input value={driverForm.phone} onChange={(e) => setDriverForm((f: any) => ({ ...f, phone: e.target.value }))} /></label>
                    <label>Vehicle Plate<input value={driverForm.vehiclePlate} onChange={(e) => setDriverForm((f: any) => ({ ...f, vehiclePlate: e.target.value }))} /></label>
                    <label>Active<select value={driverForm.active ? 'true' : 'false'} onChange={(e) => setDriverForm((f: any) => ({ ...f, active: e.target.value === 'true' }))}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select></label>

                    <div className="form-actions">
                      <button type="submit" className="primary">Save</button>
                      <button type="button" onClick={() => startEditDriver()}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="panel">
              <div className="panel-header">
                <h2>Users</h2>
                <div className="panel-actions">
                  <button className="primary" onClick={() => startEditUser()}>Add User</button>
                </div>
              </div>

              <div className="list-grid">
                <div className="list-left">
                  <div className="user-search">
                    <input placeholder="Mobile number" value={userSearch.phone} onChange={(e) => setUserSearch((s) => ({ ...s, phone: e.target.value }))} />
                    <input placeholder="Email" value={userSearch.email} onChange={(e) => setUserSearch((s) => ({ ...s, email: e.target.value }))} />
                    <input placeholder="Name" value={userSearch.full_name} onChange={(e) => setUserSearch((s) => ({ ...s, full_name: e.target.value }))} />
                    <button onClick={() => findUser()}>Find</button>
                    <button onClick={() => setUserSearch({ phone: '', email: '', full_name: '' })}>Clear</button>
                  </div>
                  <ul>
                    {users.map((u) => (
                      <li key={u.id}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {(u.actual_image || u.profile_image) ? <img src={u.actual_image || u.profile_image} className="user-list-thumb" alt="avatar" /> : null}
                          <div>
                            <strong>{u.full_name}</strong>
                            <div className="muted">{u.email} · {u.phone}</div>
                          </div>
                        </div>
                        <div className="row-actions">
                          <span className={`status ${String(u.status).toLowerCase()}`}>{u.status}</span>
                          <button onClick={() => startEditUser(u)}>Edit</button>
                          <button onClick={() => deleteUser(u.id)} className="danger">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="list-right">
                  <form onSubmit={saveUser} className="entity-form">
                    <h3>{editingUser ? 'Edit User' : 'Add User'}</h3>
                    <label>Name 
                      <input value={userForm.full_name} onChange={(e) => setUserForm((f: any) => ({ ...f, full_name: e.target.value }))} required />
                    </label>

                    <label>Email 
                      <input value={userForm.email} onChange={(e) => setUserForm((f: any) => ({ ...f, email: e.target.value }))} />
                    </label>

                    <label>Phone 
                      <input value={userForm.phone} onChange={(e) => setUserForm((f: any) => ({ ...f, phone: e.target.value }))} />
                    </label>

                    <label>Password 
                      <input value={userForm.password_hash} onChange={(e) => setUserForm((f: any) => ({ ...f, password_hash: e.target.value }))} />
                    </label>

                    <label>Profile Image Path 
                      <input value={userForm.profile_image} onChange={(e) => setUserForm((f: any) => ({ ...f, profile_image: e.target.value }))} />
                    </label>

                    <label>Upload Image <small className="muted">(jpg/png)</small>
                      <input type="file" accept="image/png,image/jpeg" onChange={(e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const name = file.name || '';
                        const extMatch = name.match(/\.([0-9a-zA-Z]+)$/);
                        const ext = extMatch ? extMatch[1].toLowerCase() : (file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : '');
                        if (!['jpg','jpeg','png'].includes(ext)) {
                          alert('Only JPG or PNG images are allowed');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          setUserForm((f: any) => ({ ...f, actual_image: result, profile_image_type: ext === 'jpeg' ? 'jpg' : ext }));
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>

                    <div style={{ marginBottom: 8 }}>
                      <strong>Preview</strong>
                      <div>
                        {(userForm.actual_image || userForm.profile_image) ? (
                          <img src={userForm.actual_image || userForm.profile_image} alt="preview" className="user-thumb" />
                        ) : (
                          <div className="muted">No image selected</div>
                        )}
                      </div>
                    </div>

                    <label>Gender 
                      <select value={userForm.gender} onChange={(e) => setUserForm((f: any) => ({ ...f, gender: e.target.value }))}>
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </label>

                    <label>Date of Birth 
                      <input type="date" value={userForm.date_of_birth} onChange={(e) => setUserForm((f: any) => ({ ...f, date_of_birth: e.target.value }))} />
                    </label>

                    <label>Role 
                      <select value={userForm.role} onChange={(e) => setUserForm((f: any) => ({ ...f, role: e.target.value }))}>
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="DRIVER">DRIVER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </label>

                    <label>Status 
                      <select value={userForm.status} onChange={(e) => setUserForm((f: any) => ({ ...f, status: e.target.value }))}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </label>

                    <div className="form-actions">
                      <button type="submit" className="primary">Save</button>
                      <button type="button" onClick={() => startEditUser()}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {tab === 'bookings' && (
            <div className="panel">
              <div className="panel-header">
                <h2>Bookings Report</h2>
                <div className="panel-actions">
                  <small className="muted">Read-only report</small>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {bookings.map((b) => (
                    <li key={b.id} style={{ padding: 10, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{b.customer}</strong>
                        <div className="muted">{b.bike} · {b.from} → {b.to}</div>
                      </div>
                      <div className="muted">{b.status}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === 'payments' && (
            <div className="panel">
              <div className="panel-header">
                <h2>Payments Report</h2>
                <div className="panel-actions">
                  <small className="muted">Read-only report</small>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {payments.map((p) => (
                    <li key={p.id} style={{ padding: 10, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>₹{p.amount}</strong>
                        <div className="muted">{p.method} · {p.date}</div>
                      </div>
                      <div className="muted">{p.status}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
