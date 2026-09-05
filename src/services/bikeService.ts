import axios from 'axios';

const API = '/api';

export async function fetchAvailableBikes() {
  return axios.get(`${API}/bikes?status=available`).then((r) => r.data);
}

export async function addBike(payload: any) {
  return axios.post(`${API}/bikes`, payload).then((r) => r.data);
}

export async function fetchAllBikeRides() {
  // Calls the backend endpoint that returns all bike ride details
  return axios.get('https://village-bike-travel-service.onrender.com/api/bikeride/allbikeride').then((r) => r.data);
}
