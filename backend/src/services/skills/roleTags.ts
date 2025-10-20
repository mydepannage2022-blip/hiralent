const DICT: Record<string, string[]> = {
  'full stack': ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
  'backend': ['Node.js', 'PostgreSQL', 'REST', 'Docker', 'CI/CD'],
  'frontend': ['React', 'TypeScript', 'HTML', 'CSS', 'Testing'],
  'data engineer': ['Python', 'Airflow', 'SQL', 'ETL', 'Cloud'],
  'ml engineer': ['Python', 'PyTorch', 'ML Ops', 'Docker', 'Cloud'],
  'product manager': ['Roadmapping', 'User Research', 'Analytics', 'Jira', 'A/B Testing'],
};

export function guessTags(title: string): string[] {
  const k = title.toLowerCase();
  for (const key of Object.keys(DICT)) {
    if (k.includes(key)) return DICT[key];
  }
  return [];
}
