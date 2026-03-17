const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyzeFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/analyze`, { method:"POST", body:form });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

export async function getAnalyses(limit=50, skip=0) {
  const res = await fetch(`${BASE}/api/analyses?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAnalysis(id) {
  const res = await fetch(`${BASE}/api/analyses/${id}`, { method:"DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
