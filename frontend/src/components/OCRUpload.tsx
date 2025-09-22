"use client";

import React, { useRef, useState } from "react";

type Status = "idle" | "hover" | "uploading" | "done" | "error";

export default function OCRPlayground() {
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setError("");
    setText("");
    setFileName(file.name);
    setStatus("uploading");
    setProgress(12);

    const fd = new FormData();
    fd.append("document", file);

    try {
      // You can change to "/api/ocr" if you proxy via Next.js rewrites.
      const res = await fetch("http://localhost:5000/api/ocr", {
        method: "POST",
        body: fd,
      });

      // fake a bit of progress for UX
      setProgress(55);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "OCR failed");

      setProgress(92);
      setText(data.ocrText || "");
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
          Drop a PDF or image (PNG/JPG). We’ll extract the text with Tesseract.
        </p>

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
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5h10.5A2.25 2.25 0 0 0 19.5 17.25V8.1A2.25 2.25 0 0 0 18.84 6.5l-3.34-3.34A2.25 2.25 0 0 0 13.26 2.5H8.25A2.25 2.25 0 0 0 6 4.75V17.25A2.25 2.25 0 0 0 8.25 19.5z" />
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
          <div className="mt-6">
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
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800">
{text}
            </pre>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-zinc-500">
        Tip: If you get a CORS error, enable <code>cors()</code> in your Express app or proxy this route in Next.js.
      </p>
    </div>
  );
}
