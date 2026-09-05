import { useState } from 'react';

const steps = [
  'Login',
  'Select Pickup',
  'Select Destination',
  'See Fare',
  'Book Bike',
  'Driver Assigned',
  'Driver Arriving',
  'Trip Started',
  'Trip Completed',
];

export default function CustomerFlow() {
  const [index, setIndex] = useState(0);
  const [bookingInfo, setBookingInfo] = useState<any | null>(null);

  function next() {
    if (index === 4) {
      // simulate booking
      setBookingInfo({ driver: null, eta: null, fare: 80 });
    }
    if (index < steps.length - 1) setIndex(index + 1);
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <main className="page">
      <h1>Customer Flow</h1>
      <p>Current step: <strong>{steps[index]}</strong></p>

      <div style={{ margin: '1rem 0' }}>
        <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
          <h3>{steps[index]}</h3>
          <p>Placeholder UI for the {steps[index]} screen.</p>

          {index === 3 && (
            <p>Estimated fare: <strong>₹80</strong></p>
          )}

          {index === 5 && bookingInfo && (
            <div>
              <p>Driver assigned! Driver: Kumar</p>
              <p>Bike: TN XX XXXX</p>
              <p>ETA: 5 minutes</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <button onClick={prev} disabled={index === 0}>Back</button>
        <button onClick={next} style={{ marginLeft: 8 }}>{index === steps.length - 1 ? 'Finish' : 'Next'}</button>
      </div>
    </main>
  );
}
