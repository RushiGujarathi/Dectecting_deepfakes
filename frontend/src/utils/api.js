const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function _handleResponse(res) {
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── File upload (image / video / audio / text file) ──────────────────────────
export async function analyzeFile(file) {
  const form = new FormData();
  form.append("file", file);
  return _handleResponse(
    await fetch(`${BASE}/api/analyze`, { method: "POST", body: form })
  );
}

// ── Direct URL scan ───────────────────────────────────────────────────────────
export async function analyzeUrl(url) {
  return _handleResponse(
    await fetch(`${BASE}/api/analyze-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
  );
}

// ── Raw text analysis (AI-generated text detection) ───────────────────────────
export async function analyzeText(text) {
  return _handleResponse(
    await fetch(`${BASE}/api/analyze-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
  );
}

// ── Webcam frame (single JPEG blob) ──────────────────────────────────────────
export async function analyzeFrame(blob) {
  const form = new FormData();
  form.append("file", blob, "frame.jpg");
  return _handleResponse(
    await fetch(`${BASE}/api/analyze-frame`, { method: "POST", body: form })
  );
}

// ── History ───────────────────────────────────────────────────────────────────
export async function getAnalyses(limit = 100, mediaType = null) {
  const params = new URLSearchParams({ limit });
  if (mediaType && mediaType !== "all") params.set("media_type", mediaType);
  return _handleResponse(
    await fetch(`${BASE}/api/analyses?${params}`)
  );
}

export async function getAnalysis(id) {
  return _handleResponse(await fetch(`${BASE}/api/analyses/${id}`));
}

export async function deleteAnalysis(id) {
  return _handleResponse(
    await fetch(`${BASE}/api/analyses/${id}`, { method: "DELETE" })
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export async function getStats() {
  return _handleResponse(await fetch(`${BASE}/api/stats`));
}

// ── Health check ─────────────────────────────────────────────────────────────
export async function healthCheck() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}