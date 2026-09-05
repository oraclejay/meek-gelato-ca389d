type BikeCardProps = {
  bikeId?: string;
  model?: string;
  status?: string;
};

export default function BikeCard({ bikeId = 'TN XX XXXX', model = 'Generic Bike', status = 'available' }: BikeCardProps) {
  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, width: 220 }}>
      <p><strong>{model}</strong></p>
      <p>ID: {bikeId}</p>
      <p>Status: {status}</p>
      <button style={{ marginTop: 8 }}>Select</button>
    </div>
  );
}
