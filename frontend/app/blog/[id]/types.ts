export type ArticleSection = {
  id: string;
  title: string;
  blocks: (
    | { type: "p"; text: string }
    | { type: "h3"; text: string }
    | { type: "callout"; title: string; text: string }
    | { type: "quote"; quote: string; by: string }
    | { type: "code"; title: string; code: string }
    | { type: "figure"; label: string; caption: string; scene?: string }
    | { type: "list"; items: string[] }
  )[];
};

export type Article = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  date: string;
  readTime: string;
  accent: string;
  coverScene: string;
  takeaways: string[];
  sections: ArticleSection[];
  prev: { id: string; title: string; accent: string };
  next: { id: string; title: string; accent: string };
};
