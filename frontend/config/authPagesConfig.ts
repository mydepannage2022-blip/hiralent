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

// Page-specific configurations
export const authPagesConfig: Record<string, AuthPageConfig> = {
  signup: {
    backgroundImage: "/images/signup.jpg",
    testimonials: commonTestimonials,
    title: "Give us your information",
    subtitle: "Please enter your personal details to set up your account and personalize your experience"
  },
  
  location: {
    backgroundImage: "/images/location.jpg", // Different image for location page
    testimonials: [
      {
        id: 1,
        name: "John Doe",
        role: "Remote Worker",
        text: "Finding the perfect location match has never been easier. Great filtering options!",
        image: "/images/testimonials/john.jpg",
      },
      ...commonTestimonials.slice(1) // Use some common ones too
    ],
    title: "Choose your location",
    subtitle: "Select your preferred work location to help us match you with the best opportunities"
  },
  
  profilePicture: {
    backgroundImage: "/images/profile-setup.jpg",
    testimonials: [
      {
        id: 1,
        name: "Maria Garcia",
        role: "Designer",
        text: "A professional profile picture made all the difference in my job search success.",
        image: "/images/testimonials/maria.jpg",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "Upload your profile picture",
    subtitle: "Add a professional photo to make a great first impression with employers"
  },
  
  skills: {
    backgroundImage: "/images/skills.jpg",
    testimonials: [
      {
        id: 1,
        name: "David Chen",
        role: "Full Stack Developer",
        text: "Showcasing my skills properly helped me land my dream job within weeks!",
        image: "/images/testimonials/david.jpg",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "Tell us about your skills",
    subtitle: "Highlight your technical and professional skills to attract the right opportunities"
  },
  
  experience: {
    backgroundImage: "/images/experience.jpg",
    testimonials: [
      {
        id: 1,
        name: "Lisa Thompson",
        role: "Project Manager",
        text: "Detailing my experience helped employers understand my true potential and value.",
        image: "/images/testimonials/lisa.jpg",
      },
      ...commonTestimonials.slice(1)
    ],
    title: "Share your experience",
    subtitle: "Tell us about your work history and achievements to build a compelling profile"
  }
};

// Utility function to get config for a specific page
export const getAuthPageConfig = (pageName: string): AuthPageConfig => {
  return authPagesConfig[pageName] || authPagesConfig.signup;
};