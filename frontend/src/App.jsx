import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  const [page, setPage] = useState("upload");
  const [lastResult, setLastResult] = useState(null);
  const mainRef = useRef(null);
  const cursorRing = useRef(null);
  const cursorDot = useRef(null);

  // Custom cursor
  useEffect(() => {
    const ring = cursorRing.current;
    const dot  = cursorDot.current;
    let mx = 0, my = 0;

    const move = (e) => {
      mx = e.clientX; my = e.clientY;
      gsap.to(dot,  { x: mx, y: my, duration: 0.08, ease: "none" });
      gsap.to(ring, { x: mx, y: my, duration: 0.22, ease: "power2.out" });
    };

    const enlarge = () => gsap.to(ring, { width: 54, height: 54, duration: 0.2 });
    const shrink  = () => gsap.to(ring, { width: 36, height: 36, duration: 0.2 });

    window.addEventListener("mousemove", move);
    document.querySelectorAll("button, a, [data-hover]").forEach(el => {
      el.addEventListener("mouseenter", enlarge);
      el.addEventListener("mouseleave", shrink);
    });

    return () => window.removeEventListener("mousemove", move);
  }, [page]);

  const navigate = (p) => {
    if (p === page) return;
    const el = mainRef.current;
    gsap.to(el, {
      opacity: 0, y: 12, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        setPage(p);
        gsap.fromTo(el,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }
        );
      }
    });
  };

  return (
    <>
      {/* Custom cursor */}
      <div id="cursor-ring" ref={cursorRing} />
      <div id="cursor-dot"  ref={cursorDot} />

      {/* Animated grid background */}
      <div className="grid-bg" />

      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-hex">◈</div>
            <span className="nav-wordmark">DEEP<span>SHIELD</span></span>
            <span className="nav-version">v2.0</span>
          </div>

          <div className="nav-links">
            {[
              { id: "upload",    label: "Analyze" },
              { id: "dashboard", label: "Results" },
              { id: "history",   label: "History" },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`nav-btn ${page === id ? "active" : ""}`}
                onClick={() => navigate(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="nav-indicator">
            <div className="pulse" />
            <span>AI ENGINE ONLINE</span>
          </div>
        </nav>

        <main className="main" ref={mainRef}>
          {page === "upload" && (
            <UploadPage
              onResult={(r) => {
                setLastResult(r);
                navigate("dashboard");
              }}
            />
          )}
          {page === "dashboard" && (
            <DashboardPage
              result={lastResult}
              onNew={() => navigate("upload")}
            />
          )}
          {page === "history" && (
            <HistoryPage
              onView={(r) => { setLastResult(r); navigate("dashboard"); }}
            />
          )}
        </main>
      </div>
    </>
  );
}
