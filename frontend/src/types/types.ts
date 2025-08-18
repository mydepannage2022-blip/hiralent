// types/signup.ts

export interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface FormTouched {
  fullName?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  text: string;
  image: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordVisibility {
  password: boolean;
  confirmPassword: boolean;
}

export type FormFieldName = keyof FormData;

export interface FormFieldProps {
  name: FormFieldName;
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  required?: boolean;
  showPasswordToggle?: boolean;
}

export interface ValidationRules {
  fullName: {
    minLength: number;
    pattern: RegExp;
  };
  email: {
    pattern: RegExp;
  };
  password: {
    minLength: number;
    patterns: {
      lowercase: RegExp;
      uppercase: RegExp;
      number: RegExp;
      special: RegExp;
    };
  };
}

export interface SignupFormProps {
  onSubmit?: (formData: FormData) => void;
  loading?: boolean;
  initialData?: Partial<FormData>;
}

export interface UseFormValidationReturn {
  formData: FormData;
  errors: FormErrors;
  touched: FormTouched;
  isFormValid: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
  setFieldValue: (field: FormFieldName, value: string) => void;
  setFieldTouched: (field: FormFieldName, touched: boolean) => void;
}