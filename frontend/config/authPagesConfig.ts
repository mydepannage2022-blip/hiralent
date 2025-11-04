// config/authPagesConfig.ts

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  text: string;
  image: string;
}

export interface AuthPageConfig {
  backgroundImage: string;
  testimonials: Testimonial[];
  title: string;
  subtitle: string;
}

// Common testimonials (you can also have page-specific ones)
export const commonTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah",
    role: "Marketing Manager",
    text: "This platform has completely transformed how we manage our projects. Simple, elegant, and exactly what we needed.",
    image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
  },
  {
    id: 2,
    name: "Ahmed Ali",
    role: "Software Developer",
    text: "Clean interface, powerful features. The user experience is outstanding and support team is incredibly responsive.",
    image: "https://img.a.transfermarkt.technology/portrait/big/995642-1712863495.jpg?lm=1",
  },
  {
    id: 3,
    name: "Emma Wilson",
    role: "Business Owner",
    text: "Six months in and still impressed. Great value, reliable service, and intuitive design that just works.",
    image: "https://resize-elle.ladmedia.fr/r/400,279,ffffff,forcex,center-middle/img/var/plain_site/storage/images/people/la-vie-des-people/news/emma-watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-emma-roberts-3979994/95896063-1-fre-FR/Emma-Watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-Emma-Roberts.jpg",
  },
];

// Company-specific testimonials
export const companyTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Novadge Marketing",
    role: "Marketing Agency",
    text: "This platform has completely transformed how we handle client campaigns. Simple, elegant, and exactly what we needed to scale efficiently.",
    image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    role: "HR Director",
    text: "Finding quality talent has never been easier. The AI matching saves us hours of screening time.",
    image: "https://img.a.transfermarkt.technology/portrait/big/995642-1712863495.jpg?lm=1",
  },
  {
    id: 3,
    name: "TechCorp Solutions",
    role: "Software Company",
    text: "Excellent platform for recruitment. The candidate quality and matching accuracy exceeded our expectations.",
    image: "https://resize-elle.ladmedia.fr/r/400,279,ffffff,forcex,center-middle/img/var/plain_site/storage/images/people/la-vie-des-people/news/emma-watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-emma-roberts-3979994/95896063-1-fre-FR/Emma-Watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-Emma-Roberts.jpg",
  },
];

// Page-specific configurations
export const authPagesConfig: Record<string, AuthPageConfig> = {
  // Candidate pages
  info: {
    backgroundImage: "/images/signup.webp",
    testimonials: commonTestimonials,
    title: "Give us your information",
    subtitle: "Please enter your personal details to set up your account and personalize your experience"
  },
  
  location: {
    backgroundImage: "/images/signup.webp",
    testimonials: [
      {
        id: 1,
        name: "John Doe",
        role: "Remote Worker",
        text: "Finding the perfect location match has never been easier. Great filtering options!",
        image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "What is your location?",
    subtitle: "Please provide your location details to match you with nearby offers."
  },

  salary: {
    backgroundImage: "/images/signup.webp",
    testimonials: [
      {
        id: 1,
        name: "Alex Kumar",
        role: "Software Engineer",
        text: "Setting clear salary expectations helped me find roles that matched my worth.",
        image: "https://img.a.transfermarkt.technology/portrait/big/995642-1712863495.jpg?lm=1",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "Tell us about your preferences",
    subtitle: "Provide your location and salary expectations to match you with the best job offers."
  },
  
  profilePicture: {
    backgroundImage: "/images/signup.webp",
    testimonials: [
      {
        id: 1,
        name: "Maria Garcia",
        role: "Designer",
        text: "A professional profile picture made all the difference in my job search success.",
        image: "https://resize-elle.ladmedia.fr/r/400,279,ffffff,forcex,center-middle/img/var/plain_site/storage/images/people/la-vie-des-people/news/emma-watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-emma-roberts-3979994/95896063-1-fre-FR/Emma-Watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-Emma-Roberts.jpg",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "Add your profile picture",
    subtitle: "Upload a professional photo to make your profile more personalized and trustworthy."
  },
  
  uploadresume: {
    backgroundImage: "/images/signup.webp",
    testimonials: [
      {
        id: 1,
        name: "David Chen",
        role: "Full Stack Developer",
        text: "Uploading my resume helped the AI match me with perfect job opportunities!",
        image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "Upload your CV/Resume",
    subtitle: "Upload your CV or resume to complete your profile and connect with job opportunities."
  },

  // Company pages
  companyRegister: {
    backgroundImage: "/images/company.webp",
    testimonials: companyTestimonials,
    title: "Give us Company information",
    subtitle: "Please enter your personal details to set up your account and personalize your experience"
  },

  companyInfo: {
    backgroundImage: "/images/company.webp",
    testimonials: [
      {
        id: 1,
        name: "TechStart Inc",
        role: "Startup Company",
        text: "Setting up our company profile was seamless. Now we're finding great candidates faster than ever.",
        image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
      },
      ...companyTestimonials.slice(1)
    ],
    title: "Tell us about your company",
    subtitle: "Provide your company details to create an attractive profile for potential candidates."
  },

  // Auth pages
  login: {
    backgroundImage: "/images/signup.webp",
    testimonials: commonTestimonials,
    title: "Welcome back",
    subtitle: "Please enter your credentials to access your account"
  },

  companyLogin: {
    backgroundImage: "/images/company.webp",
    testimonials: companyTestimonials,
    title: "Company Login",
    subtitle: "Access your company dashboard to manage jobs and candidates"
  }  ,
  companyVerification: {
  backgroundImage: "/images/company.webp",
  testimonials: companyTestimonials,
  title: "Document Verification",
  subtitle: "Upload your company registration documents for AI verification"
  }

};

// Utility function to get config for a specific page
export const getAuthPageConfig = (pageName: string): AuthPageConfig => {
  return authPagesConfig[pageName] || authPagesConfig.info;
};