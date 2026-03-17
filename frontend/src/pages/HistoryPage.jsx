import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { getAnalyses, deleteAnalysis } from "../utils/api";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MICON = { image: "🖼", video: "🎬", audio: "🎧" };

export default function HistoryPage({ onView }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef(null);

  const load = () => {
    setLoading(true);
    getAnalyses()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ results:[], total:0 }); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && data?.results?.length) {
      gsap.from(".hist-title", { opacity:0, x:-30, duration:0.5, ease:"power3.out" });
      gsap.from("tbody tr", { opacity:0, x:-20, stagger:0.04, duration:0.4, delay:0.2, ease:"power2.out" });
    }
  }, [loading, data]);

  const del = async (e, id) => {
    e.stopPropagation();
    const row = e.currentTarget.closest("tr");
    gsap.to(row, { opacity:0, x:30, duration:0.25, onComplete: () => {
      deleteAnalysis(id).then(load);
    }});
  };

  if (loading) {
    return (
      <div className="empty">
        <div style={{ width:60, height:60, margin:"0 auto 1rem",
          border:"1px solid var(--line-hi)", borderTop:"1px solid var(--teal)",
          borderRadius:"50%", animation:"spin-slow 1s linear infinite" }} />
        <p style={{ fontFamily:"var(--code)", fontSize:"0.82rem", color:"var(--t2)" }}>
          Fetching from MongoDB...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hist-header">
        <div>
          <div className="hist-title">ANALYSIS HISTORY</div>
          <div className="hist-sub">{data?.total || 0} records · MongoDB deepshield.analyses</div>
        </div>
        <button className="btn btn-ghost" onClick={load}>↻ Refresh</button>
      </div>

      {!data?.results?.length ? (
        <div className="empty">
          <div className="empty-icon">📂</div>
          <h2>NO HISTORY YET</h2>
          <p>Analyzed files appear here with full audit trail.</p>
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
                <th>Analyzed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map(r => (
                <tr key={r.id} onClick={() => onView(r)}>
                  <td>
                    <div className="fn">{r.filename}</div>
                    <div className="fn-meta">
                      {(r.file_size / 1024).toFixed(0)} KB
                    </div>
                  </td>
                  <td>{MICON[r.media_type]}</td>
                  <td>
                    <span className={`risk ${
                      r.verdict === "deepfake"   ? "high" :
                      r.verdict === "suspicious" ? "medium" : "low"
                    }`}>
                      {r.verdict}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontFamily:"var(--code)", fontSize:"0.8rem",
                      color: r.confidence > 0.8 ? "var(--teal)" : "var(--t1)"
                    }}>
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </td>
                  <td>
                    <span className={`risk ${r.risk_level}`}>{r.risk_level}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily:"var(--code)", fontSize:"0.75rem", color:"var(--t2)" }}>
                      {r.processing_time_seconds}s
                    </span>
                  </td>
                  <td>
                    <span className="t-ago">{timeAgo(r.created_at)}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding:"4px 10px", fontSize:"0.72rem" }}
                      onClick={(e) => del(e, r.id)}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
