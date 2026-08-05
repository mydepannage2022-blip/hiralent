// frontend/src/lib/api/errorMessage.ts
//
// Single reader for a human-readable message out of an API error, tolerant of BOTH
// the standard response envelope (R-36: { success:false, error:{ code, message } })
// and the legacy shapes still emitted by not-yet-normalized endpoints
// ({ message }, { error: "STRING" }, { error:true, message }). Use it in react-query
// onError handlers so a toast shows the backend's real message regardless of which
// shape a given endpoint currently uses.
//
// axios rejections carry the parsed body at err.response.data; native fetch callers
// can pass the already-parsed body as { response: { data } } or rely on err.message.
export function extractApiError(err: any, fallback = "Something went wrong"): string {
  const data = err?.response?.data;
  return (
    data?.error?.message || // envelope { error: { message } }
    (typeof data?.error === "string" ? data.error : undefined) || // { error: "STRING" }
    data?.message || // legacy top-level { message }
    err?.message || // axios/network message
    fallback
  );
}
