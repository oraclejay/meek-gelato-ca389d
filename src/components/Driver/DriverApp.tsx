import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './DriverApp.css';

type Driver = {
  id: string;
  name: string;
  vehicle?: string;
  phone?: string;
  isBooked?: boolean;
  notes?: string;
};

type Ride = {
  id: string;
  vehicle: string;
  driverId: string;
  customerName: string;
  completed: boolean;
};

export default function DriverApp() {
  const [active, setActive] = useState<'ride' | 'availability' | 'maintenance'>('ride');

  // mock drivers
  const [drivers, setDrivers] = useState<Driver[]>([
    { id: 'd1', name: 'Kumar', vehicle: 'TN01AB1234', phone: '9876543210', isBooked: true },
    { id: 'd2', name: 'Priya', vehicle: 'TN01AB5678', phone: '9123456780', isBooked: false },
    { id: 'd3', name: 'Ramesh', vehicle: 'TN01AB9012', phone: '9988776655', isBooked: false },
  ]);

  // mock rides
  const [rides, setRides] = useState<Ride[]>([
    { id: 'r1', vehicle: 'Bike', driverId: 'd1', customerName: 'Arjun Sharma', completed: false },
  ]);

  const currentRide = useMemo(() => rides.find((r) => !r.completed), [rides]);
  const currentDriver = currentRide ? drivers.find((d) => d.id === currentRide.driverId) : null;

  // Maintenance form
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState<{ name: string; vehicle: string; phone: string; notes: string }>({
    name: '',
    vehicle: '',
    phone: '',
    notes: '',
  });

  function startEdit(d?: Driver) {
    if (d) {
      setEditingDriver(d);
      setForm({ name: d.name, vehicle: d.vehicle || '', phone: d.phone || '', notes: d.notes || '' });
    } else {
      setEditingDriver(null);
      setForm({ name: '', vehicle: '', phone: '', notes: '' });
    }
  }

  function saveDriver(e?: React.FormEvent) {
    e?.preventDefault();
    if (editingDriver) {
      setDrivers((prev) => prev.map((p) => (p.id === editingDriver.id ? { ...p, ...form } : p)));
    } else {
      const newDriver: Driver = { id: `d${Date.now()}`, name: form.name, vehicle: form.vehicle, phone: form.phone, isBooked: false, notes: form.notes };
      setDrivers((prev) => [newDriver, ...prev]);
    }
    startEdit(undefined);
  }

  function toggleBooked(id: string) {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, isBooked: !d.isBooked } : d)));
  }

  function completeRide(id: string) {
    setRides((prev) => prev.map((r) => (r.id === id ? { ...r, completed: true } : r)));
    setDrivers((prev) => prev.map((d) => (d.id === currentRide?.driverId ? { ...d, isBooked: false } : d)));
  }

  return (
    <main className="driver-page">
      <aside className="driver-sidebar">
        <h2>Driver Admin</h2>
        <NavLink to="/Home" className="home-link">← Home</NavLink>
        <nav>
          <button className={active === 'ride' ? 'active' : ''} onClick={() => setActive('ride')}>Ride Status</button>
          <button className={active === 'availability' ? 'active' : ''} onClick={() => setActive('availability')}>Availability</button>
          <button className={active === 'maintenance' ? 'active' : ''} onClick={() => setActive('maintenance')}>Maintenance Record</button>
        </nav>
      </aside>

      <section className="driver-content">
        {active === 'ride' && (
          <div className="card">
            <h3>Current Ride Status</h3>
            {currentRide && currentDriver ? (
              <div className="ride-info">
                <p><strong>Vehicle:</strong> {currentRide.vehicle}</p>
                <p><strong>Driver:</strong> {currentDriver.name} ({currentDriver.vehicle})</p>
                <p><strong>Customer:</strong> {currentRide.customerName}</p>
                <p><strong>Completed:</strong> {currentRide.completed ? 'Yes' : 'No'}</p>
                {!currentRide.completed && (
                  <div className="actions">
                    <button onClick={() => completeRide(currentRide.id)} className="primary">Mark Completed</button>
                  </div>
                )}
              </div>
            ) : (
              <p>No active rides at the moment.</p>
            )}
          </div>
        )}

        {active === 'availability' && (
          <div className="card">
            <h3>Driver Availability</h3>
            <div className="availability-grid">
              {drivers.map((d) => (
                <div key={d.id} className={`driver-tile ${d.isBooked ? 'booked' : 'free'}`}>
                  <div className="driver-name">{d.name}</div>
                  <div className="driver-vehicle">{d.vehicle}</div>
                  <div className="driver-phone">{d.phone}</div>
                  <div className="driver-actions">
                    <button onClick={() => toggleBooked(d.id)}>{d.isBooked ? 'Set Free' : 'Set Booked'}</button>
                    <button onClick={() => startEdit(d)}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'maintenance' && (
          <div className="card">
            <h3>Maintenance / Driver Records</h3>

            <div className="maintenance-grid">
              <div className="driver-list">
                <div className="list-header">
                  <strong>Drivers</strong>
                  <button onClick={() => startEdit(undefined)} className="primary">Add Driver</button>
                </div>
                <ul>
                  {drivers.map((d) => (
                    <li key={d.id}>
                      <span>{d.name}</span>
                      <small>{d.vehicle}</small>
                      <div>
                        <button onClick={() => startEdit(d)}>Edit</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="driver-form">
                <h4>{editingDriver ? 'Edit Driver' : 'Add Driver'}</h4>
                <form onSubmit={saveDriver}>
                  <label>
                    Name
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </label>
                  <label>
                    Vehicle
                    <input value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))} />
                  </label>
                  <label>
                    Phone
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </label>
                  <label>
                    Notes
                    <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </label>

                  <div className="form-actions">
                    <button type="submit" className="primary">Save</button>
                    <button type="button" onClick={() => startEdit(undefined)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
