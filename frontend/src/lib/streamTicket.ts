// frontend/src/lib/streamTicket.ts
//
// The submission SSE stream is authorized with a short-lived, single-submission ticket
// instead of the real access token in the URL. Before opening the EventSource, POST to
// the mint endpoint (which is behind checkAuth + ownership, using the normal Authorization
// header) and use the returned ticket as ?ticket= on the stream URL.

export async function fetchStreamTicket(
  streamBase: string,
  submissionId: string,
  token: string | null
): Promise<string | null> {
  try {
    const base = streamBase.replace(/\/$/, "");
    const res = await fetch(
      `${base}/submissions/stream-ticket/${encodeURIComponent(submissionId)}`,
      {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.ticket === "string" ? data.ticket : null;
  } catch {
    return null;
  }
}
