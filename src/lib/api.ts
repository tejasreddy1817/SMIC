const BASE = import.meta.env.VITE_BACKEND_URL || "";

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("server_token");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${BASE}${path}`, { ...options, headers });

  if (resp.status === 401) {
    localStorage.removeItem("server_token");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }

  return resp;
}

async function apiUpload(path: string, formData: FormData): Promise<Response> {
  const token = localStorage.getItem("server_token");
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  // Do NOT set content-type — browser sets it with boundary for multipart
  const resp = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
  if (resp.status === 401) {
    localStorage.removeItem("server_token");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }
  return resp;
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
  upload: (path: string, formData: FormData) => apiUpload(path, formData),
};
