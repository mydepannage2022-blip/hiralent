import axios from 'axios';
import { APIResponse } from '../profile/profile.api';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // ✅ move this here
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

export const verifyEmail = async (token: string) => {
  const response = await api.get(`/auth/verify-email?token=${token}`);
  return response.data;
};
export const resendVerificationEmail = async () => {
  const response = await api.post('/auth/resend-verification');
  return response.data;
};

export const uploadProfilePicture = async (image: File) => {
  const formData = new FormData();
  formData.append('profilePicture', image); // backend expects 'image' field
  
  const response = await api.post('/candidates/profile-picture-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};



export const forgotPassword = async (data: { email: string }) => {
  const response = await api.post('/auth/forgot-password', data);
  return response.data;
};

export const resetPassword = async (data: { token: string; newPassword: string }) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};

export const deleteAccount = async (): Promise<APIResponse> => {
  const response = await api.delete('/auth/delete-account', {
    data: {}
  });
  
  return response.data;

  
};

export const createCompanyProfile = async (data: {
  company_name: string;
  industry: string;
  company_size: string;
  website?: string;
  location: string;
  description: string;
  registration_number: string;
  full_address: string;
}) => {
    try {
    console.log('API data:', data); // ✅ Add this
    const response = await api.post('/company/create-profile', data);
    return response.data;
  } catch (error : any) {
    console.error('API Error:', error.response?.data); // ✅ Add this
    throw error;
  }
};


export const uploadCompanyDocument = async (document: File) => {
  const formData = new FormData();
  formData.append('document', document);
  formData.append('forceType', 'company_doc');
  
  const response = await api.post('/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  console.log('✅ API Response:', response.data);
  return response.data;
};

export const getUserSessions = async () => {
  const response = await api.get('/auth/sessions/');
  return response.data;
};

export const terminateSession = async (sessionId: string) => {
  const response = await api.delete(`/auth/sessions/${sessionId}`);
  return response.data;
};

export const terminateAllOtherSessions = async () => {
  const response = await api.delete('/auth/sessions/others/terminate');
  return response.data;
};