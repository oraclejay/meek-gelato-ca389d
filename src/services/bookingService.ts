import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api';

export async function createBooking(payload: any) {
  return axios.post(`${API_BASE}/bookings`, payload).then((r) => r.data);
}

export async function fetchBookings(userId: string) {
  return axios.get(`${API_BASE}/bookings?user=${userId}`).then((r) => r.data);
}

export async function createBookingRequest(payload: any) {
  // Posts a BookingRequest-shaped payload to the backend booking API
  return axios.post('https://village-bike-travel-service.onrender.com/api/booking/request', payload).then((r) => r.data);
}
