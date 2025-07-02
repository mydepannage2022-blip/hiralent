import sanitizeHtml from "sanitize-html";
import { Request, Response, NextFunction } from "express";

export const sanitizeRichText = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.job_description_rich) {
    req.body.job_description_rich = sanitizeHtml(req.body.job_description_rich, {
      allowedTags: ["b", "i", "u", "em", "strong", "p", "ul", "li", "a", "br", "ol", "span"],
      allowedAttributes: { a: ["href", "target"], span: ["style"] },
      allowedSchemes: ["http", "https", "mailto"],
    });
  }
  next();
};
