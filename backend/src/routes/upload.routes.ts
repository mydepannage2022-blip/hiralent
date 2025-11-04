import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { upload } from "../middlewares/multer.middleware";
import {
  uploadCompanyDoc,
  uploadAgencyDoc,
  getSignedUrl,
  getPreviewUrl,
  performOCR,
} from "../controller/upload.controller";

const r = Router();

// Upload routes
r.post("/company/:companyId", checkAuth, upload.single("file"), uploadCompanyDoc);
r.post("/agency/:agencyId", checkAuth, upload.single("file"), uploadAgencyDoc);

// Get URLs
r.get("/:documentId/signed-url", checkAuth, getSignedUrl);
r.get("/:documentId/preview-url", checkAuth, getPreviewUrl);

// OCR route
r.post("/:documentId/ocr", checkAuth, performOCR);

export default r;
