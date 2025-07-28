import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // ✅ move this here
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // console.log("sending " , token)
  return config;
});


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

export const login = async (data: {
  email: string;
  password: string;
}) => {
  const response = await api.post('/auth/login', data);
  console.log(response.data);
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

export const uploadResume = async (resume: File) => {
  const formData = new FormData();
  formData.append('cv', resume);

  const token = localStorage.getItem('authToken');

  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/profile-upload`,
    formData, // 👈 FormData directly
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`, // 👈 Token in Authorization header
      },
    }
  );

  console.log(response.data);
  return response.data;
};