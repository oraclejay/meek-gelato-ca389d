type BookingCardProps = {
  pickup: string;
  drop: string;
  fare?: number;
};

export default function BookingCard({ pickup, drop, fare = 0 }: BookingCardProps) {
  return (
    <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 6 }}>
      <p><strong>Pickup:</strong> {pickup}</p>
      <p><strong>Drop:</strong> {drop}</p>
      <p><strong>Fare:</strong> ₹{fare}</p>
      <div style={{ marginTop: 8 }}>
        <button>Book</button>
      </div>
    </div>
  );
}
