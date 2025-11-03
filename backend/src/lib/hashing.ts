import crypto from "crypto";
export const sha256 = (buf: Buffer) => crypto.createHash("sha256").update(buf).digest("hex");
