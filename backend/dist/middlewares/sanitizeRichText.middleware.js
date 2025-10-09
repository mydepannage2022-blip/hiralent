"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRichText = void 0;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const sanitizeRichText = (req, res, next) => {
    if (req.body.job_description_rich) {
        req.body.job_description_rich = (0, sanitize_html_1.default)(req.body.job_description_rich, {
            allowedTags: ["b", "i", "u", "em", "strong", "p", "ul", "li", "a", "br", "ol", "span"],
            allowedAttributes: { a: ["href", "target"], span: ["style"] },
            allowedSchemes: ["http", "https", "mailto"],
        });
    }
    next();
};
exports.sanitizeRichText = sanitizeRichText;
