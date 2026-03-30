import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-computed bcrypt hash of "SeedPass@1" (cost 10)
const SEED_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

interface CandidateData {
  email: string;
  full_name: string;
  city: string;
  location: string;
  headline: string;
  about_me: string;
  skills: string[];
  minimum_salary_amount: number;
  payment_period: string;
  preferred_locations: string;
  languages: { name: string; level: string }[];
  education: { degree: string; institution: string; field: string; year: number }[];
  experience: { company: string; duration: string; job_title: string; description: string; technologies: string[] }[];
  projects: { name: string; description: string; technologies: string[] }[];
  certifications: { name: string; issuer: string; year: number }[];
  personal_info: { github: string; linkedin: string };
}

const candidates: CandidateData[] = [
  // ─── 8 BACKEND PROFILES ───────────────────────────────────────
  {
    email: 'seed.yassin.backend@hiralent.dev',
    full_name: 'Yassin El Amrani',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'Senior Node.js & NestJS Developer | REST & GraphQL APIs',
    about_me: 'Backend engineer with 5+ years building scalable APIs using Node.js, NestJS, and PostgreSQL. Passionate about clean architecture, SOLID principles, and microservices. I have delivered systems handling 1M+ requests/day for fintech and e-commerce clients in Morocco and France.',
    skills: ['Node.js', 'NestJS', 'Express.js', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'GraphQL', 'REST API', 'Prisma', 'JWT', 'Microservices', 'CI/CD', 'AWS', 'Jest', 'Swagger'],
    minimum_salary_amount: 15000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Master', institution: 'ENSIAS', field: 'Computer Science', year: 2019 }],
    experience: [
      { company: 'TechMaroc SARL', duration: '3 years', job_title: 'Senior Backend Developer', description: 'Led API development for a payment platform serving 200k users. Implemented event-driven architecture with RabbitMQ.', technologies: ['NestJS', 'PostgreSQL', 'RabbitMQ', 'Docker'] },
      { company: 'Webforce Maroc', duration: '2 years', job_title: 'Node.js Developer', description: 'Built RESTful APIs for e-commerce platform and integrated third-party payment gateways (CMI, PayPal).', technologies: ['Express.js', 'MongoDB', 'Redis', 'JWT'] },
    ],
    projects: [
      { name: 'PayLink API', description: 'Payment orchestration microservice supporting CMI and Stripe with webhook handling', technologies: ['NestJS', 'PostgreSQL', 'Stripe', 'Redis'] },
      { name: 'Inventory Sync', description: 'Real-time inventory sync between ERP and e-commerce platform using WebSockets', technologies: ['Node.js', 'Socket.io', 'MongoDB'] },
      { name: 'Auth Gateway', description: 'Centralized auth service with OAuth2, MFA, and session management', technologies: ['NestJS', 'JWT', 'Redis', 'PostgreSQL'] },
    ],
    certifications: [{ name: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', year: 2022 }],
    personal_info: { github: 'yassin-elamrani', linkedin: 'in/yassin-elamrani' },
  },
  {
    email: 'seed.hamid.api@hiralent.dev',
    full_name: 'Hamid Ouazzani',
    city: 'Rabat',
    location: 'Rabat, Morocco',
    headline: 'Backend Engineer | FastAPI · Python · PostgreSQL',
    about_me: 'Python backend specialist with deep experience in FastAPI, SQLAlchemy, and cloud deployments. I build high-performance REST APIs and data pipelines. Comfortable working in agile teams and delivering production-grade systems on tight deadlines.',
    skills: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Celery', 'Redis', 'Docker', 'Kubernetes', 'Alembic', 'Pytest', 'Pydantic', 'CI/CD', 'GitHub Actions', 'Linux', 'REST API', 'OAuth2'],
    minimum_salary_amount: 14000,
    payment_period: 'monthly',
    preferred_locations: 'Rabat, Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Engineering', institution: 'EMI Rabat', field: 'Software Engineering', year: 2020 }],
    experience: [
      { company: 'DataFlow Maroc', duration: '2 years', job_title: 'Backend Engineer', description: 'Built FastAPI services for real-time analytics dashboard. Implemented background jobs with Celery and Redis.', technologies: ['FastAPI', 'PostgreSQL', 'Celery', 'Redis'] },
      { company: 'GovTech Solutions', duration: '2 years', job_title: 'Python Developer', description: 'Developed data ingestion pipelines and REST APIs for public sector clients in Morocco.', technologies: ['Django', 'PostgreSQL', 'Docker', 'Nginx'] },
    ],
    projects: [
      { name: 'Analytics API', description: 'High-throughput FastAPI service processing 500k events/day with async workers', technologies: ['FastAPI', 'PostgreSQL', 'Celery', 'Redis'] },
      { name: 'DocParser', description: 'PDF parsing microservice extracting structured data from government documents', technologies: ['Python', 'FastAPI', 'PyMuPDF', 'PostgreSQL'] },
    ],
    certifications: [{ name: 'Google Professional Cloud Developer', issuer: 'Google', year: 2023 }],
    personal_info: { github: 'hamid-ouazzani', linkedin: 'in/hamid-ouazzani' },
  },
  {
    email: 'seed.karim.go@hiralent.dev',
    full_name: 'Karim Bensouda',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'Go & Microservices Engineer | gRPC · Kafka · Kubernetes',
    about_me: 'Systems engineer specializing in Go microservices and distributed systems. I design resilient, high-concurrency backends with gRPC, Kafka, and Kubernetes. Previously worked at a Berlin-based fintech startup before returning to Morocco.',
    skills: ['Go', 'gRPC', 'Kafka', 'Kubernetes', 'Docker', 'PostgreSQL', 'Redis', 'Prometheus', 'Grafana', 'CI/CD', 'Terraform', 'REST API', 'Microservices', 'Linux', 'Helm', 'NATS'],
    minimum_salary_amount: 18000,
    payment_period: 'monthly',
    preferred_locations: 'Remote, Casablanca',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Fluent' }, { name: 'German', level: 'Intermediate' }],
    education: [{ degree: 'Master', institution: 'ENSA Casablanca', field: 'Distributed Systems', year: 2018 }],
    experience: [
      { company: 'PayFlow GmbH (Berlin)', duration: '3 years', job_title: 'Backend Engineer (Go)', description: 'Built payment processing microservices handling 10M transactions/month using Go, gRPC and Kafka.', technologies: ['Go', 'gRPC', 'Kafka', 'PostgreSQL', 'Kubernetes'] },
      { company: 'TechMaroc', duration: '2 years', job_title: 'Software Engineer', description: 'Designed internal API gateway and service mesh for SaaS platform.', technologies: ['Go', 'Docker', 'Redis', 'Nginx'] },
    ],
    projects: [
      { name: 'TxProcessor', description: 'Distributed transaction processor with exactly-once semantics using Kafka and Go', technologies: ['Go', 'Kafka', 'PostgreSQL', 'Redis'] },
      { name: 'K8s Operator', description: 'Custom Kubernetes operator for managing database cluster lifecycle', technologies: ['Go', 'Kubernetes', 'Helm', 'Terraform'] },
      { name: 'MeshGateway', description: 'API gateway with rate limiting, auth, and observability built in Go', technologies: ['Go', 'gRPC', 'Prometheus', 'Redis'] },
    ],
    certifications: [{ name: 'Certified Kubernetes Administrator', issuer: 'CNCF', year: 2022 }],
    personal_info: { github: 'karim-bensouda', linkedin: 'in/karim-bensouda' },
  },
  {
    email: 'seed.nadia.django@hiralent.dev',
    full_name: 'Nadia Tahiri',
    city: 'Marrakech',
    location: 'Marrakech, Morocco',
    headline: 'Django REST Framework Developer | Python · PostgreSQL',
    about_me: 'Full-stack Python developer with a backend focus. Expert in Django, Django REST Framework, and Celery task queues. I love building robust admin panels and data-heavy applications. Based in Marrakech, available for remote projects internationally.',
    skills: ['Python', 'Django', 'Django REST Framework', 'Celery', 'PostgreSQL', 'SQLite', 'Redis', 'Docker', 'Nginx', 'Gunicorn', 'Pytest', 'GitHub Actions', 'AWS S3', 'Stripe', 'WebSockets', 'JWT'],
    minimum_salary_amount: 12000,
    payment_period: 'monthly',
    preferred_locations: 'Marrakech, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Bachelor', institution: 'Université Cadi Ayyad', field: 'Computer Science', year: 2019 }],
    experience: [
      { company: 'TravelTech Marrakech', duration: '3 years', job_title: 'Backend Developer', description: 'Built booking engine and payment integration for hospitality SaaS platform serving 500+ hotels.', technologies: ['Django', 'PostgreSQL', 'Stripe', 'Celery'] },
      { company: 'Freelance', duration: '2 years', job_title: 'Python Developer', description: 'Delivered 15+ client projects including e-commerce backends, admin dashboards, and API integrations.', technologies: ['Django', 'REST API', 'Docker', 'AWS'] },
    ],
    projects: [
      { name: 'HotelBook API', description: 'Multi-property booking system with availability calendar and payment workflows', technologies: ['Django REST Framework', 'PostgreSQL', 'Stripe', 'Redis'] },
      { name: 'DataExport Tool', description: 'Async CSV/Excel export pipeline for large datasets using Celery', technologies: ['Celery', 'Django', 'PostgreSQL', 'AWS S3'] },
    ],
    certifications: [],
    personal_info: { github: 'nadia-tahiri', linkedin: 'in/nadia-tahiri' },
  },
  {
    email: 'seed.omar.nestjs@hiralent.dev',
    full_name: 'Omar Idrissi',
    city: 'Tangier',
    location: 'Tangier, Morocco',
    headline: 'NestJS & TypeORM Backend Developer | API Design Expert',
    about_me: 'Backend developer with 4 years of NestJS experience, passionate about DDD, clean code, and automated testing. I have built APIs for HR platforms, logistics apps, and e-commerce. Looking for challenging remote or on-site positions in Tangier or Europe.',
    skills: ['NestJS', 'TypeScript', 'TypeORM', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Jest', 'Swagger', 'GraphQL', 'REST API', 'CI/CD', 'Prisma', 'RabbitMQ', 'WebSockets', 'Nginx'],
    minimum_salary_amount: 13000,
    payment_period: 'monthly',
    preferred_locations: 'Tangier, Remote, Spain',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'Spanish', level: 'Conversational' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Engineering', institution: 'ENSA Tangier', field: 'Computer Engineering', year: 2020 }],
    experience: [
      { company: 'LogiTech Tangier', duration: '2 years', job_title: 'Backend Engineer', description: 'Built logistics tracking API and driver management system for fleet of 1,000+ vehicles.', technologies: ['NestJS', 'PostgreSQL', 'WebSockets', 'Redis'] },
      { company: 'HRSoft Solutions', duration: '2 years', job_title: 'NestJS Developer', description: 'Developed HR management platform with payroll, leave management, and attendance tracking modules.', technologies: ['NestJS', 'TypeORM', 'MySQL', 'Docker'] },
    ],
    projects: [
      { name: 'FleetTracker API', description: 'Real-time GPS tracking API for 1000+ vehicles with WebSocket push notifications', technologies: ['NestJS', 'WebSockets', 'PostgreSQL', 'Redis'] },
      { name: 'PayrollEngine', description: 'Modular payroll calculation engine with tax rules and leave integration', technologies: ['NestJS', 'TypeORM', 'PostgreSQL', 'Jest'] },
    ],
    certifications: [],
    personal_info: { github: 'omar-idrissi', linkedin: 'in/omar-idrissi' },
  },
  {
    email: 'seed.soufiane.express@hiralent.dev',
    full_name: 'Soufiane Lahlou',
    city: 'Fes',
    location: 'Fes, Morocco',
    headline: 'Node.js / Express Backend Developer | MongoDB · Redis',
    about_me: 'Node.js developer with solid experience in Express.js, MongoDB, and real-time features using Socket.io. I focus on writing maintainable, well-tested code. Open to hybrid and fully remote roles.',
    skills: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose', 'Redis', 'Socket.io', 'JWT', 'Docker', 'Jest', 'Mocha', 'GitHub Actions', 'AWS Lambda', 'REST API', 'TypeScript', 'Nginx'],
    minimum_salary_amount: 10000,
    payment_period: 'monthly',
    preferred_locations: 'Fes, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Intermediate' }],
    education: [{ degree: 'Bachelor', institution: 'FST Fes', field: 'Software Engineering', year: 2020 }],
    experience: [
      { company: 'ChatApp Startup', duration: '1.5 years', job_title: 'Backend Developer', description: 'Built real-time messaging backend serving 50k concurrent users using Socket.io and Redis pub/sub.', technologies: ['Node.js', 'Socket.io', 'Redis', 'MongoDB'] },
    ],
    projects: [
      { name: 'LiveChat Server', description: 'Scalable real-time chat server with rooms, read receipts, and file sharing', technologies: ['Node.js', 'Socket.io', 'Redis', 'MongoDB'] },
      { name: 'REST Boilerplate', description: 'Production-ready Express.js API boilerplate with auth, rate limiting, and CI', technologies: ['Express.js', 'MongoDB', 'JWT', 'Docker'] },
    ],
    certifications: [],
    personal_info: { github: 'soufiane-lahlou', linkedin: 'in/soufiane-lahlou' },
  },
  {
    email: 'seed.imane.rust@hiralent.dev',
    full_name: 'Imane Berrada',
    city: 'Remote',
    location: 'Remote',
    headline: 'Systems Engineer | Rust · Go · High-Performance APIs',
    about_me: 'Systems-level developer specializing in Rust and Go for high-performance backend services. Experience with embedded-adjacent systems, CLI tools, and WebAssembly. Fully remote, available for global projects.',
    skills: ['Rust', 'Go', 'PostgreSQL', 'SQLite', 'Docker', 'WebAssembly', 'Tokio', 'Axum', 'gRPC', 'REST API', 'Linux', 'CI/CD', 'Redis', 'Kafka', 'Prometheus'],
    minimum_salary_amount: 20000,
    payment_period: 'monthly',
    preferred_locations: 'Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'English', level: 'Fluent' }, { name: 'French', level: 'Conversational' }],
    education: [{ degree: 'Master', institution: 'INPT Rabat', field: 'Computer Science', year: 2019 }],
    experience: [
      { company: 'RustSystems GmbH', duration: '3 years', job_title: 'Systems Engineer', description: 'Built low-latency trading data feed processor in Rust serving 100M messages/day.', technologies: ['Rust', 'Tokio', 'Kafka', 'PostgreSQL'] },
    ],
    projects: [
      { name: 'FastCache', description: 'In-memory LRU cache library in Rust with async support and TTL eviction', technologies: ['Rust', 'Tokio', 'Async'] },
      { name: 'CLI Deploy Tool', description: 'Cross-platform deployment CLI built in Go with SSH and Docker integration', technologies: ['Go', 'Docker', 'SSH', 'Linux'] },
      { name: 'WASM Query Engine', description: 'WebAssembly-compiled SQL query parser for client-side data filtering', technologies: ['Rust', 'WebAssembly', 'SQLite'] },
    ],
    certifications: [],
    personal_info: { github: 'imane-berrada', linkedin: 'in/imane-berrada' },
  },
  {
    email: 'seed.youssef.springboot@hiralent.dev',
    full_name: 'Youssef Maarouf',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'Java Spring Boot Developer | Microservices · JPA · Kafka',
    about_me: 'Java developer with 5 years of Spring Boot experience, specializing in enterprise microservices and banking systems. Experienced with JPA/Hibernate, Kafka, and Oracle DB. Looking to transition toward cloud-native architectures.',
    skills: ['Java', 'Spring Boot', 'Spring Security', 'JPA', 'Hibernate', 'Kafka', 'PostgreSQL', 'Oracle DB', 'Docker', 'Maven', 'JUnit', 'Mockito', 'REST API', 'Microservices', 'CI/CD', 'SonarQube'],
    minimum_salary_amount: 16000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Engineering', institution: 'ENSEM Casablanca', field: 'Industrial Engineering', year: 2018 }],
    experience: [
      { company: 'Banque CIH (via ESN)', duration: '4 years', job_title: 'Java Developer', description: 'Developed core banking modules including loan origination and account management using Spring Boot and Oracle.', technologies: ['Java', 'Spring Boot', 'Oracle DB', 'Kafka', 'JPA'] },
      { company: 'Sofrecom Maroc', duration: '1 year', job_title: 'Backend Developer', description: 'Built REST APIs for telecom billing system integrating with legacy SOAP services.', technologies: ['Spring Boot', 'JPA', 'PostgreSQL', 'Docker'] },
    ],
    projects: [
      { name: 'LoanOrigination', description: 'End-to-end loan application microservice with credit scoring integration', technologies: ['Spring Boot', 'Oracle DB', 'Kafka', 'JUnit'] },
      { name: 'BillingAdapter', description: 'SOAP-to-REST adapter for legacy telecom billing system', technologies: ['Spring Boot', 'SOAP', 'PostgreSQL', 'Docker'] },
    ],
    certifications: [{ name: 'Oracle Certified Professional Java SE 11', issuer: 'Oracle', year: 2021 }],
    personal_info: { github: 'youssef-maarouf', linkedin: 'in/youssef-maarouf' },
  },

  // ─── 8 FRONTEND PROFILES ──────────────────────────────────────
  {
    email: 'seed.rania.react@hiralent.dev',
    full_name: 'Rania Zouheir',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'Senior React Developer | Next.js · TypeScript · TailwindCSS',
    about_me: 'Frontend engineer with 5 years of React experience. I build pixel-perfect, accessible interfaces and design systems. Skilled in performance optimization, animations with Framer Motion, and state management with Zustand/Redux Toolkit.',
    skills: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', 'Framer Motion', 'Zustand', 'Redux Toolkit', 'React Query', 'Storybook', 'Jest', 'Testing Library', 'Figma', 'Webpack', 'Vite', 'CSS Modules', 'Radix UI'],
    minimum_salary_amount: 14000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Bachelor', institution: 'ISCAE Casablanca', field: 'Information Systems', year: 2019 }],
    experience: [
      { company: 'DesignFirst Agency', duration: '3 years', job_title: 'Senior React Developer', description: 'Led frontend team of 5, built design system used across 10+ client projects. Reduced bundle size by 40%.', technologies: ['React', 'TypeScript', 'Storybook', 'TailwindCSS'] },
      { company: 'Startup Hub Casablanca', duration: '2 years', job_title: 'Frontend Developer', description: 'Built MVPs for 4 startups including an e-commerce platform and a fintech dashboard.', technologies: ['React', 'Next.js', 'Redux', 'Stripe'] },
    ],
    projects: [
      { name: 'Atlas UI', description: 'Open-source React component library with 50+ accessible components and dark mode', technologies: ['React', 'TypeScript', 'Storybook', 'Radix UI'] },
      { name: 'EcomDash', description: 'Real-time e-commerce admin dashboard with data visualization', technologies: ['Next.js', 'React Query', 'TailwindCSS', 'Recharts'] },
    ],
    certifications: [],
    personal_info: { github: 'rania-zouheir', linkedin: 'in/rania-zouheir' },
  },
  {
    email: 'seed.amine.nextjs@hiralent.dev',
    full_name: 'Amine Boutaleb',
    city: 'Rabat',
    location: 'Rabat, Morocco',
    headline: 'Next.js Full-Stack Developer | App Router · Prisma · tRPC',
    about_me: 'Full-stack developer focused on the Next.js ecosystem. Expert in App Router, Server Components, tRPC, and Prisma ORM. I have shipped multiple SaaS products from zero to production. Clean code advocate and open-source contributor.',
    skills: ['Next.js', 'React', 'TypeScript', 'tRPC', 'Prisma', 'PostgreSQL', 'TailwindCSS', 'Zustand', 'React Query', 'Zod', 'NextAuth.js', 'Vercel', 'Docker', 'Jest', 'Playwright', 'shadcn/ui'],
    minimum_salary_amount: 15000,
    payment_period: 'monthly',
    preferred_locations: 'Rabat, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Fluent' }],
    education: [{ degree: 'Master', institution: 'ENSIAS Rabat', field: 'Software Engineering', year: 2021 }],
    experience: [
      { company: 'SaaS Studio Rabat', duration: '2 years', job_title: 'Full-Stack Developer', description: 'Built 3 SaaS products using Next.js, tRPC, and Prisma. Implemented subscription billing with Stripe.', technologies: ['Next.js', 'tRPC', 'Prisma', 'Stripe'] },
    ],
    projects: [
      { name: 'FormBuilder SaaS', description: 'Drag-and-drop form builder with analytics, conditional logic, and webhook delivery', technologies: ['Next.js', 'tRPC', 'Prisma', 'PostgreSQL', 'shadcn/ui'] },
      { name: 'DevLink', description: 'Developer portfolio platform with GitHub OAuth and project showcase', technologies: ['Next.js', 'NextAuth.js', 'TailwindCSS', 'Vercel'] },
    ],
    certifications: [],
    personal_info: { github: 'amine-boutaleb', linkedin: 'in/amine-boutaleb' },
  },
  {
    email: 'seed.sara.vuejs@hiralent.dev',
    full_name: 'Sara Benkirane',
    city: 'Marrakech',
    location: 'Marrakech, Morocco',
    headline: 'Vue.js & Nuxt Developer | Pinia · Vuetify · TypeScript',
    about_me: 'Vue.js specialist with 4 years of experience building enterprise dashboards and marketing sites. Proficient in Nuxt 3, Pinia, and the Composition API. Strong eye for UX and performance. Available for freelance and remote positions.',
    skills: ['Vue.js', 'Nuxt.js', 'TypeScript', 'Pinia', 'Vuetify', 'TailwindCSS', 'Vite', 'Vue Router', 'Vitest', 'Cypress', 'REST API', 'GraphQL', 'i18n', 'PWA', 'Docker', 'Figma'],
    minimum_salary_amount: 12000,
    payment_period: 'monthly',
    preferred_locations: 'Marrakech, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Bachelor', institution: 'FSTG Marrakech', field: 'Computer Science', year: 2020 }],
    experience: [
      { company: 'ERP Solutions MA', duration: '2 years', job_title: 'Frontend Developer', description: 'Built Vue.js dashboard for ERP system used by 50+ companies in Morocco. Led migration from Vue 2 to Vue 3.', technologies: ['Vue.js', 'Pinia', 'Vuetify', 'TypeScript'] },
      { company: 'Agency Pixel', duration: '2 years', job_title: 'Vue.js Developer', description: 'Delivered 20+ landing pages and web apps for hospitality and retail clients.', technologies: ['Nuxt.js', 'TailwindCSS', 'Vite', 'REST API'] },
    ],
    projects: [
      { name: 'HRDashboard', description: 'Multilingual HR management dashboard with real-time notifications and reporting', technologies: ['Vue.js', 'Pinia', 'Vuetify', 'i18n', 'PostgreSQL'] },
      { name: 'NuxtStore', description: 'Full-featured e-commerce PWA with offline support and cart persistence', technologies: ['Nuxt.js', 'Pinia', 'TailwindCSS', 'Stripe'] },
    ],
    certifications: [],
    personal_info: { github: 'sara-benkirane', linkedin: 'in/sara-benkirane' },
  },
  {
    email: 'seed.khalil.angular@hiralent.dev',
    full_name: 'Khalil Mansouri',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'Angular Developer | RxJS · NgRx · Material Design',
    about_me: 'Enterprise frontend developer with 5 years of Angular experience. Expert in NgRx, RxJS reactive patterns, and large-scale SPA architecture. I have worked on banking, insurance, and government portals in Morocco.',
    skills: ['Angular', 'TypeScript', 'RxJS', 'NgRx', 'Angular Material', 'TailwindCSS', 'Jest', 'Jasmine', 'Karma', 'REST API', 'GraphQL', 'Docker', 'Nx', 'SCSS', 'i18n', 'Figma'],
    minimum_salary_amount: 14000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Engineering', institution: 'École Mohammadia d\'Ingénieurs', field: 'Computer Science', year: 2019 }],
    experience: [
      { company: 'BancaTech Casablanca', duration: '4 years', job_title: 'Angular Developer', description: 'Built online banking portal used by 300k+ clients. Implemented lazy loading and micro-frontend architecture.', technologies: ['Angular', 'NgRx', 'RxJS', 'Angular Material'] },
      { company: 'Freelance', duration: '1 year', job_title: 'Frontend Consultant', description: 'Delivered Angular upgrades and feature development for insurance and government clients.', technologies: ['Angular', 'TypeScript', 'NgRx', 'REST API'] },
    ],
    projects: [
      { name: 'BankingPortal', description: 'Secure online banking SPA with multi-factor auth and real-time transaction feed', technologies: ['Angular', 'NgRx', 'RxJS', 'Angular Material'] },
      { name: 'InsuranceClaims', description: 'Claims management portal with document upload, OCR integration, and status tracking', technologies: ['Angular', 'TypeScript', 'REST API', 'NgRx'] },
    ],
    certifications: [],
    personal_info: { github: 'khalil-mansouri', linkedin: 'in/khalil-mansouri' },
  },
  {
    email: 'seed.hind.reactnative@hiralent.dev',
    full_name: 'Hind El Fassi',
    city: 'Tangier',
    location: 'Tangier, Morocco',
    headline: 'React Native Developer | iOS & Android · Expo · TypeScript',
    about_me: 'Mobile developer specializing in React Native for cross-platform iOS and Android apps. Experienced with Expo, React Navigation, and native module bridging. Have published 3 apps on both App Store and Google Play.',
    skills: ['React Native', 'Expo', 'TypeScript', 'React Navigation', 'Redux Toolkit', 'React Query', 'Firebase', 'OneSignal', 'Jest', 'Detox', 'Reanimated', 'Zustand', 'REST API', 'GraphQL', 'Fastlane'],
    minimum_salary_amount: 13000,
    payment_period: 'monthly',
    preferred_locations: 'Tangier, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Bachelor', institution: 'FSTT Tangier', field: 'Computer Science', year: 2020 }],
    experience: [
      { company: 'MobileFirst Maroc', duration: '3 years', job_title: 'React Native Developer', description: 'Led development of 3 published apps including a food delivery app with 50k+ downloads.', technologies: ['React Native', 'Expo', 'Firebase', 'Redux Toolkit'] },
    ],
    projects: [
      { name: 'FoodNow', description: 'Food delivery app with real-time order tracking and driver matching (50k+ downloads)', technologies: ['React Native', 'Expo', 'Firebase', 'Google Maps'] },
      { name: 'FitTrack', description: 'Fitness tracking app with workout plans, progress charts, and Apple Health integration', technologies: ['React Native', 'Reanimated', 'SQLite', 'HealthKit'] },
    ],
    certifications: [],
    personal_info: { github: 'hind-elfassi', linkedin: 'in/hind-elfassi' },
  },
  {
    email: 'seed.achraf.uiux@hiralent.dev',
    full_name: 'Achraf Lamrani',
    city: 'Fes',
    location: 'Fes, Morocco',
    headline: 'UI/UX Designer & React Developer | Figma · Design Systems',
    about_me: 'Designer-turned-developer with expertise in Figma, design systems, and translating high-fidelity prototypes into production-quality React code. I bridge the gap between design and engineering, ensuring pixel-perfect implementation.',
    skills: ['React', 'TypeScript', 'Figma', 'TailwindCSS', 'shadcn/ui', 'Radix UI', 'Framer Motion', 'Storybook', 'CSS', 'SCSS', 'Accessibility', 'Adobe XD', 'Sketch', 'Design Tokens', 'Prototyping'],
    minimum_salary_amount: 11000,
    payment_period: 'monthly',
    preferred_locations: 'Fes, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Intermediate' }],
    education: [{ degree: 'Bachelor', institution: 'EST Fes', field: 'Multimedia Design', year: 2019 }],
    experience: [
      { company: 'AgencePix', duration: '2 years', job_title: 'UI Developer', description: 'Designed and implemented UI for SaaS platforms, maintaining design system consistency across 5 products.', technologies: ['React', 'Figma', 'TailwindCSS', 'Storybook'] },
      { company: 'Freelance', duration: '2 years', job_title: 'UI/UX Developer', description: 'Delivered 30+ Figma designs and React implementations for startups and agencies.', technologies: ['Figma', 'React', 'SCSS', 'CSS'] },
    ],
    projects: [
      { name: 'MoroccoUI', description: 'Arabic-first React component library with RTL support and Moroccan design aesthetics', technologies: ['React', 'Radix UI', 'TailwindCSS', 'Storybook'] },
      { name: 'LandingBuilder', description: 'Drag-and-drop landing page builder with Figma import and component export', technologies: ['React', 'Framer Motion', 'TypeScript', 'TailwindCSS'] },
    ],
    certifications: [],
    personal_info: { github: 'achraf-lamrani', linkedin: 'in/achraf-lamrani' },
  },
  {
    email: 'seed.fatima.svelte@hiralent.dev',
    full_name: 'Fatima Lahlou',
    city: 'Remote',
    location: 'Remote',
    headline: 'SvelteKit & Svelte Developer | Full-Stack · TypeScript',
    about_me: 'Early Svelte adopter and SvelteKit enthusiast. I build blazing-fast web apps with minimal JavaScript overhead. Full-stack capable with Prisma and PostgreSQL on the backend. Remote-only, working with teams in Morocco, France, and Germany.',
    skills: ['Svelte', 'SvelteKit', 'TypeScript', 'TailwindCSS', 'Prisma', 'PostgreSQL', 'Vite', 'Vitest', 'Playwright', 'Docker', 'Cloudflare Workers', 'REST API', 'GraphQL', 'Zod', 'Drizzle ORM'],
    minimum_salary_amount: 13000,
    payment_period: 'monthly',
    preferred_locations: 'Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Master', institution: 'ENSA Marrakech', field: 'Web Technologies', year: 2021 }],
    experience: [
      { company: 'EdgeApp Studio', duration: '2 years', job_title: 'SvelteKit Developer', description: 'Built marketing sites and web apps deployed on Cloudflare Workers/Pages with SvelteKit SSR.', technologies: ['SvelteKit', 'TailwindCSS', 'Cloudflare', 'TypeScript'] },
    ],
    projects: [
      { name: 'svelte-forms-lib', description: 'Lightweight form validation library for Svelte with Zod schema integration', technologies: ['Svelte', 'TypeScript', 'Zod', 'Vite'] },
      { name: 'SpeedBlog', description: 'Blazing-fast blog platform with edge rendering and Markdown support', technologies: ['SvelteKit', 'Cloudflare Workers', 'TailwindCSS', 'Drizzle ORM'] },
    ],
    certifications: [],
    personal_info: { github: 'fatima-lahlou', linkedin: 'in/fatima-lahlou' },
  },
  {
    email: 'seed.mehdi.typescript@hiralent.dev',
    full_name: 'Mehdi Brahim',
    city: 'Rabat',
    location: 'Rabat, Morocco',
    headline: 'TypeScript Fullstack Developer | React · Node.js · tRPC',
    about_me: 'TypeScript-first developer building type-safe full-stack applications. Expert in monorepo setups with Turborepo, tRPC end-to-end type safety, and Zod validation. Contributor to open-source TypeScript projects.',
    skills: ['TypeScript', 'React', 'Node.js', 'tRPC', 'Zod', 'Prisma', 'PostgreSQL', 'TailwindCSS', 'Turborepo', 'Nx', 'Vitest', 'Playwright', 'Docker', 'ESLint', 'Prettier', 'GitHub Actions'],
    minimum_salary_amount: 14000,
    payment_period: 'monthly',
    preferred_locations: 'Rabat, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Fluent' }],
    education: [{ degree: 'Engineering', institution: 'INSEA Rabat', field: 'Statistics & Applied Economics', year: 2020 }],
    experience: [
      { company: 'TypeSafe Labs', duration: '2 years', job_title: 'Full-Stack Developer', description: 'Built B2B SaaS platform in a Turborepo monorepo with shared UI packages and end-to-end type safety.', technologies: ['TypeScript', 'React', 'tRPC', 'Prisma'] },
    ],
    projects: [
      { name: 'ts-validate', description: 'Runtime validation library extending Zod with database query type inference', technologies: ['TypeScript', 'Zod', 'Prisma'] },
      { name: 'MonorepoStarter', description: 'Production-ready Turborepo template with Next.js, NestJS, shared UI, and CI', technologies: ['Turborepo', 'Next.js', 'NestJS', 'TypeScript'] },
    ],
    certifications: [],
    personal_info: { github: 'mehdi-brahim', linkedin: 'in/mehdi-brahim' },
  },

  // ─── 5 AI/ML PROFILES ─────────────────────────────────────────
  {
    email: 'seed.adil.aiml@hiralent.dev',
    full_name: 'Adil Cherkaoui',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'AI/ML Engineer | LLMs · RAG · LangChain · Python',
    about_me: 'AI engineer with 3 years specializing in LLM applications, Retrieval-Augmented Generation, and production ML systems. I have built AI-powered document Q&A, code review tools, and customer support bots. Deep expertise in LangChain, OpenAI API, and vector databases.',
    skills: ['Python', 'LangChain', 'LangGraph', 'OpenAI API', 'RAG', 'Chroma', 'Pinecone', 'Weaviate', 'FastAPI', 'PostgreSQL', 'pgvector', 'HuggingFace', 'Transformers', 'Docker', 'AWS', 'Pydantic'],
    minimum_salary_amount: 18000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Fluent' }],
    education: [{ degree: 'Master', institution: 'UM5 Rabat', field: 'Artificial Intelligence', year: 2021 }],
    experience: [
      { company: 'AIStartup Casablanca', duration: '2 years', job_title: 'AI Engineer', description: 'Built enterprise RAG system for legal document search, reducing lawyer research time by 60%. Integrated with Claude and GPT-4.', technologies: ['Python', 'LangChain', 'Pinecone', 'FastAPI', 'PostgreSQL'] },
      { company: 'Consulting AI', duration: '1 year', job_title: 'ML Consultant', description: 'Delivered 5 LLM proof-of-concepts for Moroccan enterprises in banking, telecoms, and retail.', technologies: ['OpenAI API', 'LangChain', 'Python', 'Docker'] },
    ],
    projects: [
      { name: 'LegalRAG', description: 'RAG pipeline for Moroccan legal corpus with multilingual Arabic/French retrieval', technologies: ['LangChain', 'pgvector', 'PostgreSQL', 'FastAPI'] },
      { name: 'CodeReviewer AI', description: 'Automated code review bot using GPT-4 with GitHub PR integration', technologies: ['OpenAI API', 'Python', 'GitHub API', 'FastAPI'] },
      { name: 'DocChat', description: 'Multi-document Q&A system with citation tracking and hallucination detection', technologies: ['LangGraph', 'Chroma', 'HuggingFace', 'Streamlit'] },
    ],
    certifications: [{ name: 'DeepLearning.AI LangChain Certificate', issuer: 'DeepLearning.AI', year: 2023 }],
    personal_info: { github: 'adil-cherkaoui', linkedin: 'in/adil-cherkaoui' },
  },
  {
    email: 'seed.zineb.pytorch@hiralent.dev',
    full_name: 'Zineb Rachidi',
    city: 'Rabat',
    location: 'Rabat, Morocco',
    headline: 'ML Engineer | PyTorch · Computer Vision · NLP',
    about_me: 'Machine learning engineer specializing in computer vision and NLP models. Experience training, fine-tuning, and deploying large models on cloud infrastructure. Published research on Arabic NLP at two international conferences.',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'HuggingFace Transformers', 'Scikit-learn', 'OpenCV', 'YOLO', 'BERT', 'FastAPI', 'Docker', 'AWS SageMaker', 'MLflow', 'Weights & Biases', 'NumPy', 'Pandas'],
    minimum_salary_amount: 17000,
    payment_period: 'monthly',
    preferred_locations: 'Rabat, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Fluent' }],
    education: [{ degree: 'PhD (in progress)', institution: 'Mohammed V University', field: 'Machine Learning / NLP', year: 2024 }],
    experience: [
      { company: 'NLPLab Research', duration: '2 years', job_title: 'ML Researcher', description: 'Developed Arabic dialect classification model achieving state-of-the-art F1 on Darija benchmark. Fine-tuned CamemBERT on Moroccan French corpus.', technologies: ['PyTorch', 'HuggingFace', 'BERT', 'Python'] },
      { company: 'VisionTech MA', duration: '1 year', job_title: 'CV Engineer', description: 'Built real-time defect detection system for manufacturing using YOLOv8, achieving 98.5% precision.', technologies: ['YOLO', 'OpenCV', 'PyTorch', 'Docker', 'FastAPI'] },
    ],
    projects: [
      { name: 'DarijaLM', description: 'Language model fine-tuned on Moroccan Darija Arabic dialect with 50k training samples', technologies: ['PyTorch', 'HuggingFace', 'Python', 'AWS'] },
      { name: 'DefectVision', description: 'Industrial defect detection system with real-time inference on edge devices', technologies: ['YOLOv8', 'OpenCV', 'TensorRT', 'Docker'] },
    ],
    certifications: [{ name: 'Deep Learning Specialization', issuer: 'DeepLearning.AI / Coursera', year: 2022 }],
    personal_info: { github: 'zineb-rachidi', linkedin: 'in/zineb-rachidi' },
  },
  {
    email: 'seed.tariq.datasci@hiralent.dev',
    full_name: 'Tariq Benali',
    city: 'Fes',
    location: 'Fes, Morocco',
    headline: 'Data Scientist | Python · Spark · SQL · ML Pipelines',
    about_me: 'Data scientist turning raw data into business insights and ML models. Expert in the full data pipeline from ingestion to model deployment. Worked with telecoms, retail, and agriculture sectors in Morocco and West Africa.',
    skills: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'XGBoost', 'Apache Spark', 'SQL', 'PostgreSQL', 'BigQuery', 'Tableau', 'Power BI', 'MLflow', 'Airflow', 'Docker', 'dbt', 'Jupyter'],
    minimum_salary_amount: 13000,
    payment_period: 'monthly',
    preferred_locations: 'Fes, Remote, Casablanca',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Master', institution: 'UIZ Agadir', field: 'Data Science & Business Intelligence', year: 2020 }],
    experience: [
      { company: 'Maroc Telecom Analytics', duration: '2 years', job_title: 'Data Scientist', description: 'Built churn prediction model saving 15M MAD/year. Developed customer segmentation used by marketing teams.', technologies: ['Python', 'Scikit-learn', 'XGBoost', 'BigQuery', 'Airflow'] },
      { company: 'AgriData MA', duration: '1.5 years', job_title: 'ML Engineer', description: 'Created crop yield prediction models using satellite imagery and weather data for 3,000 farms.', technologies: ['Python', 'PyTorch', 'Pandas', 'SQL', 'Tableau'] },
    ],
    projects: [
      { name: 'ChurnGuard', description: 'Telecom churn prediction model with explainability dashboard and alert system', technologies: ['XGBoost', 'SHAP', 'Python', 'Power BI'] },
      { name: 'CropIQ', description: 'Satellite-based crop yield forecasting using time-series ML and weather APIs', technologies: ['Python', 'Scikit-learn', 'Pandas', 'Airflow'] },
    ],
    certifications: [{ name: 'Google Professional Data Engineer', issuer: 'Google', year: 2022 }],
    personal_info: { github: 'tariq-benali', linkedin: 'in/tariq-benali' },
  },
  {
    email: 'seed.kawtar.llmops@hiralent.dev',
    full_name: 'Kawtar Alaoui',
    city: 'Remote',
    location: 'Remote',
    headline: 'LLMOps Engineer | Anthropic API · LangChain · Prompt Engineering',
    about_me: 'LLMOps engineer bridging ML research and production systems. Expert in prompt engineering, LLM evaluation, fine-tuning workflows, and AI application security. Worked with Claude, GPT-4, and Mistral in production at scale.',
    skills: ['Python', 'LangChain', 'LangSmith', 'Anthropic API', 'OpenAI API', 'Mistral', 'Prompt Engineering', 'RAG', 'Vector DBs', 'FastAPI', 'Docker', 'AWS', 'Evaluation Frameworks', 'Guardrails AI', 'RAGAS', 'pgvector'],
    minimum_salary_amount: 20000,
    payment_period: 'monthly',
    preferred_locations: 'Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Fluent' }],
    education: [{ degree: 'Master', institution: 'ENSIAS', field: 'AI & Machine Learning', year: 2022 }],
    experience: [
      { company: 'ClaudeApps Inc. (Remote)', duration: '1.5 years', job_title: 'LLMOps Engineer', description: 'Built evaluation harness for Claude-based legal AI using RAGAS and LangSmith. Reduced hallucination rate by 35%.', technologies: ['Anthropic API', 'LangSmith', 'RAGAS', 'Python'] },
    ],
    projects: [
      { name: 'PromptGuard', description: 'Automated prompt injection detection and jailbreak prevention layer for LLM APIs', technologies: ['Python', 'Guardrails AI', 'FastAPI', 'Docker'] },
      { name: 'LLM Bench MA', description: 'Benchmark suite for Arabic LLMs evaluating factuality, fluency, and safety', technologies: ['Python', 'LangSmith', 'HuggingFace', 'Anthropic API'] },
    ],
    certifications: [],
    personal_info: { github: 'kawtar-alaoui', linkedin: 'in/kawtar-alaoui' },
  },
  {
    email: 'seed.said.fastapi.ai@hiralent.dev',
    full_name: 'Said El Moussaoui',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'AI Backend Engineer | FastAPI · Celery · Embeddings · RAG',
    about_me: 'Backend engineer specialized in serving AI models at scale. I design async inference APIs, embedding pipelines, and retrieval systems. Experienced in integrating OpenAI, Anthropic, and open-source models into enterprise SaaS products.',
    skills: ['Python', 'FastAPI', 'Celery', 'PostgreSQL', 'pgvector', 'Redis', 'Docker', 'OpenAI API', 'Anthropic API', 'HuggingFace', 'Qdrant', 'Weaviate', 'Kubernetes', 'GitHub Actions', 'Pydantic', 'Alembic'],
    minimum_salary_amount: 16000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Engineering', institution: 'ENSA Casablanca', field: 'Computer Science', year: 2020 }],
    experience: [
      { company: 'SaaS AI Platform', duration: '2 years', job_title: 'AI Backend Engineer', description: 'Designed embedding pipeline processing 1M documents/day and serving vector search via pgvector with sub-100ms latency.', technologies: ['FastAPI', 'pgvector', 'Celery', 'OpenAI API'] },
    ],
    projects: [
      { name: 'EmbedServer', description: 'High-throughput text embedding service supporting multiple models with batching and caching', technologies: ['FastAPI', 'HuggingFace', 'Redis', 'Docker'] },
      { name: 'SearchAI', description: 'Hybrid semantic + keyword search API combining pgvector and BM25', technologies: ['FastAPI', 'pgvector', 'PostgreSQL', 'Qdrant'] },
    ],
    certifications: [],
    personal_info: { github: 'said-elmoussaoui', linkedin: 'in/said-elmoussaoui' },
  },

  // ─── 2 ODOO PROFILES ──────────────────────────────────────────
  {
    email: 'seed.wafae.odoo@hiralent.dev',
    full_name: 'Wafae Essaidi',
    city: 'Casablanca',
    location: 'Casablanca, Morocco',
    headline: 'Odoo Developer | Python · QWeb · ERP Customization',
    about_me: 'Certified Odoo developer with 4 years of experience customizing and deploying Odoo ERP solutions for Moroccan SMEs. Expert in module development, QWeb reports, and Odoo 16/17 upgrades. Fluent in business process analysis and translating requirements to Odoo workflows.',
    skills: ['Odoo', 'Python', 'XML', 'QWeb', 'JavaScript', 'PostgreSQL', 'OWL', 'Odoo Studio', 'Docker', 'Git', 'REST API', 'JSON-RPC', 'Accounting', 'Inventory', 'Manufacturing', 'HR', 'CRM'],
    minimum_salary_amount: 12000,
    payment_period: 'monthly',
    preferred_locations: 'Casablanca, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Intermediate' }],
    education: [{ degree: 'Bachelor', institution: 'Université Hassan II', field: 'Management Information Systems', year: 2019 }],
    experience: [
      { company: 'OdooPartner MA', duration: '3 years', job_title: 'Odoo Developer', description: 'Delivered 10+ Odoo implementations for retail, manufacturing, and services companies. Developed custom modules for Moroccan accounting and HR regulations.', technologies: ['Odoo', 'Python', 'QWeb', 'PostgreSQL', 'XML'] },
      { company: 'ERP Maroc', duration: '1 year', job_title: 'Junior Odoo Developer', description: 'Implemented Odoo accounting and inventory modules for 3 SMEs in the Casablanca region.', technologies: ['Odoo', 'Python', 'XML', 'PostgreSQL'] },
    ],
    projects: [
      { name: 'MoroccoPayroll Module', description: 'Custom Odoo HR module handling Moroccan CNSS, IR, and AMO payroll calculations', technologies: ['Odoo', 'Python', 'XML', 'PostgreSQL'] },
      { name: 'QRInvoice Module', description: 'Odoo module generating QR-code invoices compliant with Moroccan tax authority requirements', technologies: ['Odoo', 'QWeb', 'Python', 'XML'] },
    ],
    certifications: [{ name: 'Odoo Functional Certification', issuer: 'Odoo S.A.', year: 2022 }],
    personal_info: { github: 'wafae-essaidi', linkedin: 'in/wafae-essaidi' },
  },
  {
    email: 'seed.bilal.odoo@hiralent.dev',
    full_name: 'Bilal Sebbari',
    city: 'Marrakech',
    location: 'Marrakech, Morocco',
    headline: 'Odoo Technical Consultant | Python · OWL · ERP Integration',
    about_me: 'Odoo technical consultant specializing in complex integrations between Odoo and third-party systems (CMI payment, customs APIs, e-commerce platforms). Deep knowledge of the Odoo ORM, OWL frontend framework, and JSON-RPC API.',
    skills: ['Odoo', 'Python', 'OWL', 'JavaScript', 'QWeb', 'PostgreSQL', 'XML', 'JSON-RPC', 'REST API', 'Docker', 'Git', 'CMI Payment', 'WooCommerce', 'EDI', 'Odoo Studio', 'Nginx'],
    minimum_salary_amount: 13000,
    payment_period: 'monthly',
    preferred_locations: 'Marrakech, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Engineering', institution: 'ENSAM Marrakech', field: 'Industrial Engineering', year: 2020 }],
    experience: [
      { company: 'TechERP Solutions', duration: '3 years', job_title: 'Odoo Technical Consultant', description: 'Integrated Odoo 16 with CMI payment gateway, customs EDI system, and WooCommerce for major Moroccan retailer.', technologies: ['Odoo', 'Python', 'OWL', 'REST API', 'PostgreSQL'] },
    ],
    projects: [
      { name: 'CMI Payment Odoo', description: 'Odoo payment acquirer module integrating CMI payment gateway for Moroccan businesses', technologies: ['Odoo', 'Python', 'CMI API', 'QWeb'] },
      { name: 'WooOdoo Sync', description: 'Real-time bidirectional sync between WooCommerce and Odoo inventory/orders', technologies: ['Odoo', 'Python', 'WooCommerce API', 'Celery'] },
    ],
    certifications: [{ name: 'Odoo Technical Certification', issuer: 'Odoo S.A.', year: 2023 }],
    personal_info: { github: 'bilal-sebbari', linkedin: 'in/bilal-sebbari' },
  },

  // ─── 2 QA PROFILES ────────────────────────────────────────────
  {
    email: 'seed.asmaa.qa@hiralent.dev',
    full_name: 'Asmaa Raji',
    city: 'Rabat',
    location: 'Rabat, Morocco',
    headline: 'QA Engineer | Cypress · Playwright · Jest · API Testing',
    about_me: 'Automation QA engineer with expertise in E2E, integration, and API testing. I implement testing strategies that catch regressions before production. Experienced in Agile teams, CI/CD pipeline integration, and test coverage dashboards.',
    skills: ['Cypress', 'Playwright', 'Jest', 'Testing Library', 'Postman', 'k6', 'Selenium', 'Mocha', 'Chai', 'GitHub Actions', 'Docker', 'TypeScript', 'Python', 'REST API', 'BDD', 'Jira'],
    minimum_salary_amount: 10000,
    payment_period: 'monthly',
    preferred_locations: 'Rabat, Remote',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }],
    education: [{ degree: 'Bachelor', institution: 'FSR Rabat', field: 'Computer Science', year: 2020 }],
    experience: [
      { company: 'FinTech Maroc', duration: '2 years', job_title: 'QA Automation Engineer', description: 'Built Playwright E2E test suite with 400+ tests. Reduced regression testing time from 2 days to 1 hour. Integrated into GitHub Actions CI.', technologies: ['Playwright', 'TypeScript', 'GitHub Actions', 'k6'] },
      { company: 'AgenceTech', duration: '1 year', job_title: 'QA Engineer', description: 'Performed manual and automated testing for 5 web applications. Wrote API tests with Postman and Newman.', technologies: ['Cypress', 'Postman', 'Jira', 'Selenium'] },
    ],
    projects: [
      { name: 'E2E Framework', description: 'Reusable Playwright test framework with fixtures, auth helpers, and HTML reports', technologies: ['Playwright', 'TypeScript', 'GitHub Actions', 'Allure'] },
      { name: 'LoadTest Suite', description: 'k6 performance test suite with thresholds for banking API (1000 concurrent users)', technologies: ['k6', 'JavaScript', 'Docker', 'Grafana'] },
    ],
    certifications: [{ name: 'ISTQB Foundation Level', issuer: 'ISTQB', year: 2021 }],
    personal_info: { github: 'asmaa-raji', linkedin: 'in/asmaa-raji' },
  },
  {
    email: 'seed.hassan.qa@hiralent.dev',
    full_name: 'Hassan Filali',
    city: 'Tangier',
    location: 'Tangier, Morocco',
    headline: 'QA Lead | Test Strategy · Selenium · BDD · Performance Testing',
    about_me: 'Senior QA professional with 5 years of experience leading test teams and defining quality strategies. Expert in BDD with Cucumber, Selenium WebDriver, and performance testing with JMeter and k6. I mentor junior QA engineers and drive quality culture in development teams.',
    skills: ['Selenium', 'Cucumber', 'BDD', 'JMeter', 'k6', 'Cypress', 'Python', 'Java', 'Postman', 'REST API', 'Jira', 'Confluence', 'GitHub Actions', 'Jenkins', 'Docker', 'TestRail'],
    minimum_salary_amount: 12000,
    payment_period: 'monthly',
    preferred_locations: 'Tangier, Remote, Spain',
    languages: [{ name: 'Arabic', level: 'Native' }, { name: 'French', level: 'Fluent' }, { name: 'English', level: 'Professional' }, { name: 'Spanish', level: 'Conversational' }],
    education: [{ degree: 'Bachelor', institution: 'FSTT Tangier', field: 'Software Engineering', year: 2019 }],
    experience: [
      { company: 'BankaSoft Maroc', duration: '3 years', job_title: 'QA Lead', description: 'Led team of 4 QA engineers for online banking platform. Established BDD framework with Cucumber and maintained 600+ test cases.', technologies: ['Selenium', 'Cucumber', 'Java', 'Jenkins', 'JMeter'] },
      { company: 'AgenceTech Tanger', duration: '2 years', job_title: 'QA Engineer', description: 'Performed functional, regression, and performance testing for SaaS platform with 10k+ users.', technologies: ['Cypress', 'Postman', 'k6', 'Jira'] },
    ],
    projects: [
      { name: 'BDD Suite Banking', description: '600-scenario BDD test suite for banking portal using Cucumber and Selenium WebDriver', technologies: ['Selenium', 'Cucumber', 'Java', 'TestRail'] },
      { name: 'PerfTest Reports', description: 'Automated JMeter/k6 performance report generator with trend analysis and alerting', technologies: ['JMeter', 'k6', 'Python', 'Grafana'] },
    ],
    certifications: [{ name: 'ISTQB Advanced Test Analyst', issuer: 'ISTQB', year: 2022 }],
    personal_info: { github: 'hassan-filali', linkedin: 'in/hassan-filali' },
  },
];

export async function seedCandidates() {
  console.log('👥 Seeding 25 candidate profiles...');

  let created = 0;
  let updated = 0;

  for (const c of candidates) {
    // 1. Upsert the User record
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { full_name: c.full_name },
      create: {
        email: c.email,
        password_hash: SEED_HASH,
        full_name: c.full_name,
        role: 'candidate',
        is_email_verified: true,
      },
    });

    // 2. Upsert the CandidateProfile
    const profileData = {
      headline: c.headline.slice(0, 120),
      about_me: c.about_me.slice(0, 500),
      city: c.city,
      location: c.location,
      skills: c.skills,
      minimum_salary_amount: c.minimum_salary_amount,
      payment_period: c.payment_period,
      preferred_locations: c.preferred_locations,
      // String? fields: must be JSON.stringify'd
      languages: JSON.stringify(c.languages),
      education: JSON.stringify(c.education),
      experience: JSON.stringify(c.experience),
      // Json? fields: pass objects directly
      projects: c.projects,
      certifications: c.certifications,
      personal_info: c.personal_info,
    };

    const existing = await prisma.candidateProfile.findUnique({
      where: { candidate_id: user.user_id },
    });

    if (existing) {
      await prisma.candidateProfile.update({
        where: { candidate_id: user.user_id },
        data: profileData,
      });
      updated++;
    } else {
      await prisma.candidateProfile.create({
        data: { candidate_id: user.user_id, ...profileData },
      });
      created++;
    }
  }

  console.log(`✅ Candidates seeded: ${created} created, ${updated} updated (${created + updated} total)`);
}

// Allow running standalone: npx tsx prisma/seeds/candidates.seed.ts
if (require.main === module) {
  seedCandidates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seed error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
