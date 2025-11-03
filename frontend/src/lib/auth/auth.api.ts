import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("📤 Sending request with token:", token.substring(0, 20) + "...");
  } else {
    console.log("📤 Sending request without token");
  }
  return config;
});

export const signup = async (data: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}) => {
  const response = await api.post('/auth/signup', data);
  console.log("📥 Signup response:", response.data);
  return response.data;
};

export const login = async (data: {
  email: string;
  password: string;
}) => {
  console.log("🔐 Attempting login for:", data.email);
  const response = await api.post('/auth/login', data);
  console.log("📥 Login response:", response.data);
  
  // ✅ Vérifier que le token existe
  if (!response.data.token) {
    console.error("❌ No token in API response!");
    throw new Error("No authentication token received from server");
  }
  
  // ✅ Vérifier que l'utilisateur existe
  if (!response.data.user) {
    console.error("❌ No user in API response!");
    throw new Error("No user data received from server");
  }
  
  console.log("✅ API response valid - token and user present");
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
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
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
  formData.append('profilePicture', image);
  
  const response = await api.post('/candidates/profile-picture-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
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
    console.log('📤 Creating company profile with data:', data);
    const response = await api.post('/company/create-profile', data);
    console.log('✅ Company profile created:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Company profile creation failed:', error.response?.data);
    throw error;
  }
};