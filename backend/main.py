from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn, uuid, os, time
from datetime import datetime
from pathlib import Path
from database import db
from models import MediaType
from detector import analyze_media

app = FastAPI(title="DeepShield API", version="5.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    # Images
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/gif", "image/bmp", "image/tiff",
    # Video
    "video/mp4", "video/avi", "video/quicktime", "video/mov",
    "video/webm", "video/mkv", "video/x-matroska", "video/x-msvideo",
    # Audio
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/mp4", "audio/m4a", "audio/flac",
    "audio/aac", "audio/x-flac",
    # Text
    "text/plain", "text/html", "text/markdown",
    "application/json",
}

def detect_media_type(content_type: str, filename: str = "") -> MediaType:
    ct = content_type.lower().split(";")[0].strip()
    ext = Path(filename).suffix.lower() if filename else ""

    if ct.startswith("image/"):
        return MediaType.IMAGE
    if ct.startswith("video/") or ext in [".mp4", ".avi", ".mov", ".webm", ".mkv"]:
        return MediaType.VIDEO
    if ct.startswith("audio/") or ext in [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"]:
        return MediaType.AUDIO
    if ct.startswith("text/") or ext in [".txt", ".md", ".json", ".html"]:
        return MediaType.TEXT
    # Fallback: guess from extension
    img_exts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]
    if ext in img_exts:
        return MediaType.IMAGE
    return MediaType.IMAGE


async def run_analysis(file_path, filename, file_size, content_type, source="upload"):
    media_type = detect_media_type(content_type, filename)
    start  = time.time()
    result = await analyze_media(str(file_path), media_type, content_type)
    pt     = round(time.time() - start, 3)

    file_id = str(uuid.uuid4())
    doc = {
        "_id":                 file_id,
        "filename":            filename,
        "file_size":           file_size,
        "content_type":        content_type,
        "media_type":          media_type.value,
        "source":              source,
        "verdict":             result["verdict"],
        "confidence":          result["confidence"],
        "authenticity_score":  result["authenticity_score"],
        "risk_level":          result["risk_level"],
        "analysis_details":    result["details"],
        "indicators":          result["indicators"],
        "model_scores":        result["model_scores"],
        "processing_time_seconds": pt,
        "created_at":          datetime.utcnow().isoformat(),
        "file_path":           str(file_path),
    }
    await db.analyses.insert_one(doc)
    doc["id"] = doc.pop("_id")
    del doc["file_path"]
    return doc


@app.get("/")
async def root():
    return {"message": "DeepShield API v5.0", "status": "operational"}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "version": "5.0.0"}


@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    ct = (file.content_type or "application/octet-stream").lower().split(";")[0].strip()
    ext = Path(file.filename or "").suffix.lower()

    # Accept unknown types if extension is recognisable
    ok_exts = {".jpg",".jpeg",".png",".webp",".gif",".bmp",
               ".mp4",".avi",".mov",".webm",".mkv",
               ".mp3",".wav",".ogg",".m4a",".flac",".aac",
               ".txt",".md",".json"}
    if ct not in ALLOWED_TYPES and ext not in ok_exts:
        raise HTTPException(400, f"Unsupported file type: {ct} ({ext})")

    content = await file.read()
    if len(content) > 500 * 1024 * 1024:   # 500 MB cap
        raise HTTPException(413, "File too large (max 500 MB)")

    fid = str(uuid.uuid4())
    fp  = UPLOAD_DIR / f"{fid}{ext}"
    fp.write_bytes(content)

    try:
        result = await run_analysis(fp, file.filename or "upload", len(content), ct)
    finally:
        if fp.exists():
            fp.unlink(missing_ok=True)

    return JSONResponse(result)


@app.post("/api/analyze-url")
async def analyze_url_endpoint(body: dict):
    import httpx, mimetypes
    url = body.get("url", "").strip()
    if not url:
        raise HTTPException(400, "URL required")

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "DeepShield/5.0"})
            r.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(408, "Request timed out fetching URL")
    except Exception as e:
        raise HTTPException(400, f"Fetch failed: {e}")

    ct = r.headers.get("content-type", "").split(";")[0].strip()
    if not any(ct.startswith(p) for p in ("image/", "video/", "audio/", "text/")):
        raise HTTPException(400, f"Not a supported media type at URL: {ct}")

    ext  = mimetypes.guess_extension(ct) or ".bin"
    fp   = UPLOAD_DIR / f"url_{uuid.uuid4()}{ext}"
    fp.write_bytes(r.content)

    fname = url.split("/")[-1].split("?")[0] or f"url_media{ext}"
    try:
        result = await run_analysis(fp, fname, len(r.content), ct, "url")
    finally:
        if fp.exists():
            fp.unlink(missing_ok=True)

    return JSONResponse(result)


@app.post("/api/analyze-text")
async def analyze_text_endpoint(body: dict):
    """Analyze raw text for AI generation."""
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text field required")
    if len(text) < 10:
        raise HTTPException(400, "Text too short (minimum 10 characters)")

    fid = str(uuid.uuid4())
    fp  = UPLOAD_DIR / f"{fid}.txt"
    fp.write_text(text, encoding="utf-8")

    try:
        result = await run_analysis(fp, "text_input.txt", len(text.encode()), "text/plain", "text")
    finally:
        if fp.exists():
            fp.unlink(missing_ok=True)

    return JSONResponse(result)


@app.post("/api/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    """Live webcam frame analysis."""
    content = await file.read()
    fp = UPLOAD_DIR / f"frame_{uuid.uuid4()}.jpg"
    fp.write_bytes(content)
    try:
        result = await run_analysis(fp, "webcam_frame.jpg", len(content), "image/jpeg", "webcam")
    finally:
        if fp.exists():
            fp.unlink(missing_ok=True)
    return JSONResponse(result)


@app.get("/api/analyses")
async def get_analyses(limit: int = 50, skip: int = 0, media_type: str = None):
    query = {}
    if media_type and media_type != "all":
        query["media_type"] = media_type
    cursor  = db.analyses.find(query, {"file_path": 0}).sort("created_at", -1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = doc.pop("_id")
        results.append(doc)
    total = await db.analyses.count_documents(query)
    return {"total": total, "results": results}


@app.get("/api/analyses/{aid}")
async def get_analysis(aid: str):
    doc = await db.analyses.find_one({"_id": aid}, {"file_path": 0})
    if not doc:
        raise HTTPException(404, "Analysis not found")
    doc["id"] = doc.pop("_id")
    return doc


@app.delete("/api/analyses/{aid}")
async def delete_analysis(aid: str):
    r = await db.analyses.delete_one({"_id": aid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Analysis not found")
    return {"message": "Deleted", "id": aid}


@app.get("/api/stats")
async def get_stats():
    total  = await db.analyses.count_documents({})
    dp     = await db.analyses.count_documents({"verdict": "deepfake"})
    au     = await db.analyses.count_documents({"verdict": "authentic"})
    su     = await db.analyses.count_documents({"verdict": "suspicious"})
    by_t   = {m: await db.analyses.count_documents({"media_type": m})
              for m in ["image", "video", "audio", "text"]}
    agg    = await db.analyses.aggregate(
        [{"$group": {"_id": None, "avg": {"$avg": "$confidence"}}}]
    ).to_list(1)
    return {
        "total_analyses":      total,
        "deepfakes_detected":  dp,
        "authentic_media":     au,
        "suspicious_media":    su,
        "by_media_type":       by_t,
        "average_confidence":  round(agg[0]["avg"], 2) if agg else 0,
        "detection_rate":      round(dp / total * 100, 1) if total else 0,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)