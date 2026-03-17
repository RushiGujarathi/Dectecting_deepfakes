const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyzeFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

export async function analyzeUrl(url) {
  const res = await fetch(`${BASE}/api/analyze-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

export async function analyzeFrame(blob) {
  const form = new FormData();
  form.append("file", blob, "frame.jpg");
  const res = await fetch(`${BASE}/api/analyze-frame`, { method: "POST", body: form });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

export async function getAnalyses(limit = 100) {
  const res = await fetch(`${BASE}/api/analyses?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAnalysis(id) {
  const res = await fetch(`${BASE}/api/analyses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}