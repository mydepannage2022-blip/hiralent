"use client";

import React, { useRef, useState } from "react";

type Status = "idle" | "hover" | "uploading" | "done" | "error";

export default function OCRPlayground() {
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [signal, setSignal] = useState<any>(null); // <-- shows what got saved
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Simple controls to pass context to backend
  const [runId, setRunId] = useState<string>(""); // REQUIRED to persist to DB
  const [expectedCompanyName, setExpectedCompanyName] = useState<string>("");
  const [expectedRegistrationNumber, setExpectedRegistrationNumber] = useState<string>("");
  const [expectedAddress, setExpectedAddress] = useState<string>("");

  const upload = async (file: File) => {
    setError("");
    setText("");
    setParsed(null);
    setSignal(null);
    setFileName(file.name);
    setStatus("uploading");
    setProgress(12);

    const fd = new FormData();
    fd.append("document", file);

    // --- IMPORTANT: include runId so backend writes VerificationSignal
    if (runId.trim()) fd.append("runId", runId.trim());

    // Optional: send “expected_*” to help matching when you don’t have them in DB yet
    if (expectedCompanyName.trim()) fd.append("expected_company_name", expectedCompanyName.trim());
    if (expectedRegistrationNumber.trim()) fd.append("expected_registration_number", expectedRegistrationNumber.trim());
    if (expectedAddress.trim()) fd.append("expected_address", expectedAddress.trim());

    try {
      const res = await fetch("http://localhost:5000/api/ocr", {
        method: "POST",
        body: fd,
      });

      setProgress(55);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "OCR failed");

      setProgress(92);
      setText(data.ocrText || "");
      setParsed(data.parsed || null);
      setSignal(data.signal || null); // <-- shows DB-saved signal (when runId provided)
      setStatus("done");
      setProgress(100);
    } catch (e: any) {
      setStatus("error");
      setError(e.message || "Network error");
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setStatus("idle");
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setStatus("hover");
  };

  const onDragLeave = () => setStatus("idle");

  const copy = async () => {
    await navigator.clipboard.writeText(text || "");
  };

  const reset = () => {
    setStatus("idle");
    setText("");
    setParsed(null);
    setSignal(null);
    setError("");
    setFileName("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">OCR Playground</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Drop a PDF or image (PNG/JPG). We’ll extract the text with Tesseract, parse it, and (optionally) save a verification signal.
        </p>

        {/* Context inputs (runId + optional expected fields) */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700">Verification Run ID (required to save to DB)</label>
            <input
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="e.g. 5f1f9c0a-... (VerificationRun.run_id)"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Expected Company Name (optional)</label>
            <input
              value={expectedCompanyName}
              onChange={(e) => setExpectedCompanyName(e.target.value)}
              placeholder="TECHNOVISION SARL"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Expected Registration Number (optional)</label>
            <input
              value={expectedRegistrationNumber}
              onChange={(e) => setExpectedRegistrationNumber(e.target.value)}
              placeholder="ICE/RC/IF/etc."
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700">Expected Address (optional)</label>
            <input
              value={expectedAddress}
              onChange={(e) => setExpectedAddress(e.target.value)}
              placeholder="12 Rue Zerktouni, Casablanca 20100, Maroc"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Dropzone */}
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            "mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition",
            status === "hover" ? "border-indigo-500 bg-indigo-50/60" : "border-zinc-300 hover:border-zinc-400",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={onInput}
            className="hidden"
          />
          <div className="flex items-center gap-3 text-zinc-700">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5h10.5A2.25 2.25 0 0 0 19.5 17.25V8.1A2.25 2.25 0 0 0 18.84 6.5l-3.34-3.34A2.25 2.25 0 0 0 13.26 2.5H8.25A2.25 2.25 0 0 0 6 4.75V17.25A2.25 2.25 0 0 0 8.25 19.5z"
              />
            </svg>
            <div className="text-center">
              <p className="font-medium">Click to upload</p>
              <p className="text-xs text-zinc-500">or drag & drop a file here</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Accepted: PDF, PNG, JPG </p>
        </label>

        {/* File name / status */}
        {(status === "uploading" || fileName) && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="truncate max-w-[16rem]">{fileName || "Uploading..."}</span>
            </div>
            {status === "uploading" ? (
              <span className="text-zinc-500">{progress}%</span>
            ) : (
              <button onClick={reset} className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-200">
                Clear
              </button>
            )}
          </div>
        )}

        {/* Progress bar */}
        {status === "uploading" && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error || "Something went wrong."}
          </div>
        )}

        {/* Output */}
        {status === "done" && (
          <div className="mt-6 space-y-6">
            {/* OCR Text */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-700">Extracted Text</h2>
                <div className="flex gap-2">
                  <button
                    onClick={copy}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    Copy
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-black"
                  >
                    New File
                  </button>
                </div>
              </div>
              <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800">
                {text}
              </pre>
            </div>

            {/* Structured JSON */}
            {parsed && (
              <div>
                <h2 className="mb-2 text-sm font-medium text-zinc-700">Structured JSON</h2>
                <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50 p-4 text-xs leading-relaxed text-zinc-800">
                  {JSON.stringify(parsed, null, 2)}
                </pre>
              </div>
            )}

            {/* Saved Verification Signal */}
            {signal && (
              <div>
                <h2 className="mb-2 text-sm font-medium text-zinc-700">Verification Signal (Saved)</h2>
                <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-zinc-800">
                  {JSON.stringify(signal, null, 2)}
                </pre>
                {!runId && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Note: This appears only when a <code>runId</code> is provided.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-zinc-500">
        Tip: If you get a CORS error, enable <code>cors()</code> in your Express app or proxy this route in Next.js.
      </p>
    </div>
  );
}

