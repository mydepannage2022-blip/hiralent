import clamav from "clamav.js";

const host = process.env.CLAMAV_HOST || "127.0.0.1";
const port = Number(process.env.CLAMAV_PORT || 3310);

// TEMP toggle if you need to bypass AV while setting up infra
const NO_AV = process.env.DISABLE_AV === "1";

export async function scanBuffer(buffer: Buffer): Promise<void> {
  if (NO_AV) return;

  await new Promise<void>((resolve, reject) => {
    // Ensure daemon reachable first
    clamav.ping(port, host, 1500, (err) => {
      if (err) return reject(new Error("Antivirus not reachable"));

      clamav.scanBuffer(buffer, port, host, (err2, _object, malicious) => {
        if (err2) return reject(err2);
        if (malicious) return reject(new Error("Virus detected"));
        resolve();
      });
    });
  });
}
