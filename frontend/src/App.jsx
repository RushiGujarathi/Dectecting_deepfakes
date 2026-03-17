import { useState, useRef } from "react";
import { gsap } from "gsap";
import AnalyzePage    from "./pages/AnalyzePage";
import ResultPage     from "./pages/ResultPage";
import HistoryPage    from "./pages/HistoryPage";
import WebcamPage     from "./pages/WebcamPage";
import UrlScannerPage from "./pages/UrlScannerPage";
import ChatBot        from "./components/ChatBot";

export default function App() {
  const [page,       setPage]       = useState("analyze");
  const [result,     setResult]     = useState(null);
  const [mediaType,  setMediaType]  = useState("image");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showChat,   setShowChat]   = useState(false);
  const mainRef = useRef(null);

  const goTo = (p) => {
    if (p === page) return;
    gsap.to(mainRef.current, {
      opacity: 0, y: 8, duration: 0.18, ease: "power2.in",
      onComplete: () => {
        setPage(p);
        gsap.fromTo(mainRef.current, { opacity:0, y:-8 }, { opacity:1, y:0, duration:0.28, ease:"power3.out" });
      }
    });
  };

  const handleResult = (r, mt, file) => {
    setResult(r);
    setMediaType(mt);
    if (file) setUploadedFile(file);
    goTo("result");
  };

  const TABS = [
    { id:"analyze",   label:"Analyze",  color:"img"  },
    { id:"webcam",    label:"Live Cam", color:"vid"  },
    { id:"url",       label:"URL Scan", color:"vid"  },
    { id:"history",   label:"History",  color:"hist" },
  ];

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo">◈</div>
          <span className="nav-name">DEEP<span>SHIELD</span></span>
          <span className="nav-badge">v4.0</span>
        </div>

        <div className="nav-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-tab ${(page===t.id||(page==="result"&&t.id==="analyze")) ? `active ${t.color}` : ""}`}
              onClick={() => goTo(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* AI Chat toggle */}
          <button
            onClick={() => setShowChat(p => !p)}
            style={{
              fontFamily:"var(--body)", fontSize:"0.76rem", fontWeight:600,
              letterSpacing:"0.06em", textTransform:"uppercase",
              padding:"6px 14px", borderRadius:"6px",
              border:`1px solid ${showChat ? "rgba(0,170,255,0.4)" : "rgba(255,255,255,0.08)"}`,
              background: showChat ? "var(--img-dim)" : "transparent",
              color: showChat ? "var(--img)" : "var(--t2)",
              cursor:"pointer", transition:"all 0.18s",
              display:"flex", alignItems:"center", gap:"6px"
            }}
          >
            🤖 AI Chat
          </button>
          <div className="nav-online">
            <div className="dot-pulse" />
            ONLINE
          </div>
        </div>
      </nav>

      {/* AI Chatbot sidebar */}
      {showChat && (
        <div style={{
          position:"fixed", bottom:20, right:20, width:400, zIndex:1000,
          boxShadow:"0 20px 60px rgba(0,0,0,0.5)"
        }}>
          <ChatBot lastResult={result} />
        </div>
      )}

      <main className="main" ref={mainRef}>
        {page === "analyze" && <AnalyzePage onResult={handleResult} />}
        {page === "result"  && <ResultPage result={result} mediaType={mediaType} uploadedFile={uploadedFile} onNew={() => goTo("analyze")} onHistory={() => goTo("history")} />}
        {page === "webcam"  && <WebcamPage />}
        {page === "url"     && <UrlScannerPage />}
        {page === "history" && <HistoryPage onView={(r,mt)=>handleResult(r,mt,null)} onAnalyze={() => goTo("analyze")} />}
      </main>
    </div>
  );
}