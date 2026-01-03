// src/utils/categoryMapping.ts

export type QuestionCategory = 
  | 'dsa'           // Data Structures & Algorithms
  | 'web-dev'       // Web Development
  | 'databases'     // Databases & SQL
  | 'python'        // Python specific
  | 'java'          // Java specific
  | 'javascript'    // JavaScript/TypeScript
  | 'devops'        // DevOps & System Design
  | 'algorithms'    // Pure algorithms
  | 'system-design' // System design
  | 'testing'       // Testing & QA
  | 'security'      // Security
  | 'ml-data'       // ML & Data Science
  | 'business'      // Business & Finance
  | 'general'       // General/Uncategorized
  ;

/**
 * Maps domains and tags to question categories
 */
export function categorizeQuestion(
  domain: string,
  tags: string[]
): QuestionCategory[] {
  const categories = new Set<QuestionCategory>();
  
  const lowerDomain = domain.toLowerCase();
  const lowerTags = tags.map(t => t.toLowerCase());
  
  // DSA patterns
  const dsaKeywords = ['array', 'tree', 'graph', 'heap', 'stack', 'queue', 
    'linked-list', 'hash', 'dp', 'dynamic-programming', 'greedy', 'backtrack',
    'dfs', 'bfs', 'binary-search', 'sort', 'recursion', 'data-structure'];
  
  // Web Dev patterns
  const webDevKeywords = ['react', 'vue', 'angular', 'next', 'express', 
    'node', 'api', 'rest', 'graphql', 'http', 'cors', 'authentication',
    'frontend', 'backend', 'web', 'html', 'css', 'dom'];
  
  // Database patterns
  const dbKeywords = ['sql', 'database', 'postgres', 'mysql', 'mongodb',
    'query', 'join', 'index', 'nosql', 'orm', 'prisma', 'sequelize',
    'transaction', 'acid'];
  
  // Python patterns
  const pythonKeywords = ['python', 'django', 'flask', 'pandas', 'numpy',
    'fastapi', 'pydantic', 'asyncio'];
  
  // Java patterns
  const javaKeywords = ['java', 'spring', 'springboot', 'maven', 'gradle',
    'hibernate', 'jpa'];
  
  // JavaScript patterns
  const jsKeywords = ['javascript', 'typescript', 'js', 'ts', 'promise',
    'async-await', 'closure', 'prototype'];
  
  // DevOps patterns
  const devopsKeywords = ['docker', 'kubernetes', 'k8s', 'ci-cd', 'jenkins',
    'github-actions', 'terraform', 'ansible', 'deployment', 'cloud', 'aws',
    'azure', 'gcp', 'microservices', 'nginx', 'load-balancer'];
  
  // ML & Data Science
  const mlKeywords = ['machine-learning', 'ml', 'deep-learning', 'neural',
    'regression', 'classification', 'clustering', 'scikit', 'tensorflow',
    'pytorch', 'data-science'];
  
  // Security
  const securityKeywords = ['security', 'authentication', 'authorization',
    'jwt', 'oauth', 'encryption', 'xss', 'csrf', 'injection'];
  
  // Testing
  const testingKeywords = ['testing', 'test', 'jest', 'pytest', 'unit-test',
    'integration-test', 'tdd', 'mock'];
  
  // System Design
  const systemDesignKeywords = ['system-design', 'architecture', 'scalability',
    'distributed', 'caching', 'message-queue', 'kafka', 'rabbitmq'];
  
  // Business/Finance
  const businessKeywords = ['business', 'finance', 'accounting', 'marketing',
    'management', 'agile', 'scrum', 'project-management'];
  
  // Check domain
  if (dsaKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('dsa');
  }
  if (webDevKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('web-dev');
  }
  if (dbKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('databases');
  }
  if (pythonKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('python');
  }
  if (javaKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('java');
  }
  if (jsKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('javascript');
  }
  if (devopsKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('devops');
  }
  if (mlKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('ml-data');
  }
  if (securityKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('security');
  }
  if (testingKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('testing');
  }
  if (systemDesignKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('system-design');
  }
  if (businessKeywords.some(k => lowerDomain.includes(k))) {
    categories.add('business');
  }
  
  // Check tags
  lowerTags.forEach(tag => {
    if (dsaKeywords.some(k => tag.includes(k))) {
      categories.add('dsa');
    }
    if (webDevKeywords.some(k => tag.includes(k))) {
      categories.add('web-dev');
    }
    if (dbKeywords.some(k => tag.includes(k))) {
      categories.add('databases');
    }
    if (pythonKeywords.some(k => tag.includes(k))) {
      categories.add('python');
    }
    if (javaKeywords.some(k => tag.includes(k))) {
      categories.add('java');
    }
    if (jsKeywords.some(k => tag.includes(k))) {
      categories.add('javascript');
    }
    if (devopsKeywords.some(k => tag.includes(k))) {
      categories.add('devops');
    }
    if (mlKeywords.some(k => tag.includes(k))) {
      categories.add('ml-data');
    }
    if (securityKeywords.some(k => tag.includes(k))) {
      categories.add('security');
    }
    if (testingKeywords.some(k => tag.includes(k))) {
      categories.add('testing');
    }
    if (systemDesignKeywords.some(k => tag.includes(k))) {
      categories.add('system-design');
    }
    if (businessKeywords.some(k => tag.includes(k))) {
      categories.add('business');
    }
  });
  
  // If still empty, check if it's algorithms
  if (categories.size === 0) {
    const algorithmKeywords = ['algorithm', 'complexity', 'optimization', 'search'];
    if (algorithmKeywords.some(k => lowerDomain.includes(k) || lowerTags.some(t => t.includes(k)))) {
      categories.add('algorithms');
    }
  }
  
  // Default to general if still no category
  if (categories.size === 0) {
    categories.add('general');
  }
  
  return Array.from(categories);
}

/**
 * Get human-readable category name
 */
export function getCategoryDisplayName(category: QuestionCategory): string {
  const names: Record<QuestionCategory, string> = {
    'dsa': 'Data Structures & Algorithms',
    'web-dev': 'Web Development',
    'databases': 'Databases & SQL',
    'python': 'Python',
    'java': 'Java',
    'javascript': 'JavaScript/TypeScript',
    'devops': 'DevOps & Cloud',
    'algorithms': 'Algorithms',
    'system-design': 'System Design',
    'testing': 'Testing & QA',
    'security': 'Security',
    'ml-data': 'ML & Data Science',
    'business': 'Business & Finance',
    'general': 'General',
  };
  return names[category];
}