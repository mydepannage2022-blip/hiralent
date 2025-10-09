import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.middleware";
import { upload } from "../middlewares/multer.middleware";
import {
  uploadCompanyDoc,
  uploadAgencyDoc,
  getSignedUrl,
  getPreviewUrl,
} from "../controller/upload.controller";

const r = Router();

r.post("/company/:companyId", checkAuth, upload.single("file"), uploadCompanyDoc);
r.post("/agency/:agencyId",  checkAuth, upload.single("file"), uploadAgencyDoc);
r.get("/:documentId/signed-url", checkAuth, getSignedUrl);
r.get("/:documentId/preview-url", checkAuth, getPreviewUrl);

export default r;
