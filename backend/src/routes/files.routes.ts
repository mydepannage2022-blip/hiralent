// backend/src/routes/files.routes.ts
//
// Replacement for the old public `express.static('/uploads')`. Files are served ONLY
// via a short-lived signed token (see utils/signedFile.ts). The token is minted
// behind checkAuth and encodes the relative uploads path + an expiry; this route
// verifies it and streams the file. No token / expired / tampered => no file.

import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { verifyFileToken } from "../utils/signedFile";

const router = Router();

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// GET /api/v1/files/:token
router.get("/:token", (req: Request, res: Response) => {
  const parsed = verifyFileToken(req.params.token);
  if (!parsed) {
    return res.status(401).json({ error: true, message: "Invalid or expired file link" });
  }

  // Resolve to an absolute path and hard-verify it stays under the uploads root.
  const absPath = path.resolve(UPLOADS_ROOT, parsed.relPath);
  const rootWithSep = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : UPLOADS_ROOT + path.sep;
  if (absPath !== UPLOADS_ROOT && !absPath.startsWith(rootWithSep)) {
    return res.status(400).json({ error: true, message: "Bad file path" });
  }

  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return res.status(404).json({ error: true, message: "File not found" });
  }

  if (absPath.toLowerCase().endsWith(".pdf")) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
  }

  // Pass a callback so a read error (e.g. the file is removed after the existsSync
  // check — a race) becomes a clean 404 instead of an unhandled stream error / hang.
  return res.sendFile(absPath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: true, message: "File not found" });
    }
  });
});

export default router;
