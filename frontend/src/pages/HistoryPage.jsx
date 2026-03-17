import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { getAnalyses, deleteAnalysis } from "../utils/api";

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON  = { image: "🖼", video: "🎬", audio: "🎧" };
const TYPE_COLOR = { image: "img", video: "vid", audio: "aud" };

export default function HistoryPage({ onView, onAnalyze }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const tableRef = useRef(null);

  const load = () => {
    setLoading(true);
    getAnalyses(100)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ results: [], total: 0 }); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && data?.results?.length) {
      gsap.from(".hist-heading", { opacity: 0, x: -24, duration: 0.5, ease: "power3.out" });
      gsap.from("tbody tr", { opacity: 0, x: -16, stagger: 0.04, duration: 0.35, delay: 0.2, ease: "power2.out" });
    }
  }, [loading, data, filter]);

  const del = async (e, id) => {
    e.stopPropagation();
    const row = e.currentTarget.closest("tr");
    gsap.to(row, { opacity: 0, x: 30, duration: 0.2, onComplete: () => deleteAnalysis(id).then(load) });
  };

  const filtered = data?.results?.filter(r =>
    filter === "all" || r.media_type === filter
  ) || [];

  const counts = {
    all:   data?.results?.length || 0,
    image: data?.results?.filter(r => r.media_type === "image").length || 0,
    video: data?.results?.filter(r => r.media_type === "video").length || 0,
    audio: data?.results?.filter(r => r.media_type === "audio").length || 0,
  };

  if (loading) {
    return (
      <div className="empty">
        <div style={{ width: 56, height: 56, margin: "0 auto 1rem",
          border: "1px solid rgba(0,170,255,0.3)", borderTop: "1px solid var(--img)",
          borderRadius: "50%", animation: "rot 1s linear infinite" }} />
        <div className="empty-sub" style={{ fontFamily: "var(--mono)", fontSize: "0.8rem" }}>
          Fetching from MongoDB...
        </div>
      </div>
    );
  }

  return (
    <div className="hist-wrap">
      <div className="hist-top">
        <div>
          <div className="hist-heading">HISTORY</div>
          <div className="hist-sub">{data?.total || 0} total records · MongoDB deepshield.analyses</div>
        </div>
        <button className="ghost-btn" onClick={load}>↻ Refresh</button>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {[
          { id: "all",   label: `All (${counts.all})` },
          { id: "image", label: `🖼 Images (${counts.image})` },
          { id: "video", label: `🎬 Videos (${counts.video})` },
          { id: "audio", label: `🎧 Audio (${counts.audio})` },
        ].map(f => (
          <button
            key={f.id}
            className={`ftab ${f.id} ${filter === f.id ? "on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="empty">
          <span className="empty-icon">📂</span>
          <div className="empty-title">NO RECORDS</div>
          <div className="empty-sub" style={{ marginBottom: "1.5rem" }}>
            {filter === "all" ? "No analyses yet." : `No ${filter} analyses yet.`}
          </div>
          <button className="ghost-btn" onClick={onAnalyze}>+ Analyze a File</button>
        </div>
      ) : (
        <div className="tbl-wrap" ref={tableRef}>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Verdict</th>
                <th>Confidence</th>
                <th>Risk</th>
                <th>Time</th>
                <th>Scanned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => onView(r, r.media_type)}>
                  <td>
                    <div className="fn">{r.filename}</div>
                    <div className="fn-sub">{(r.file_size / 1024).toFixed(0)} KB</div>
                  </td>
                  <td>
                    <span className={`type-chip ${TYPE_COLOR[r.media_type]}`}>
                      {TYPE_ICON[r.media_type]} {r.media_type}
                    </span>
                  </td>
                  <td>
                    <span className={`risk ${r.verdict === "deepfake" ? "high" : r.verdict === "suspicious" ? "medium" : "low"}`}>
                      {r.verdict}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", color: r.confidence > 0.8 ? "var(--real)" : "var(--t1)" }}>
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </td>
                  <td><span className={`risk ${r.risk_level}`}>{r.risk_level}</span></td>
                  <td>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--t2)" }}>
                      {r.processing_time_seconds}s
                    </span>
                  </td>
                  <td><span className="t-ago">{timeAgo(r.created_at)}</span></td>
                  <td>
                    <button className="ghost-btn" style={{ padding: "4px 9px", fontSize: "0.7rem" }}
                      onClick={(e) => del(e, r.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}