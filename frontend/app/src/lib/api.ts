import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // ✅ move this here
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // console.log("sending " , token)
  return config;
});

interface LoginInput {
  email: string;
  password: string;
}


export const signup = async (data: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}) => {
  const response = await api.post('/auth/signup', data);
  console.log(response.data)
  return response.data;
};

export const login = async (data: LoginInput) => {
  const response = await axios.post('/api/v1/users/login', data);
  return response.data;
};


export const updateLocation = async (data: {
  location: string;
  postalCode: number;
}) => {
  const res = await api.patch('/candidates/update-location', data);
  return res.data;
};

export const updateSalary = async (data: {
  minimumSalary: number;
  paymentPeriod: string;
}) => {
  const res = await api.patch('/candidates/update-salary', data);
  return res.data;
};

