from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn, uuid, os, time
from datetime import datetime
from pathlib import Path
from database import db
from models import MediaType
from detector import analyze_media

app = FastAPI(title="DeepShield API", version="4.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def detect_media_type(content_type: str) -> MediaType:
    if content_type.startswith("image"): return MediaType.IMAGE
    if content_type.startswith("video"): return MediaType.VIDEO
    return MediaType.AUDIO


async def run_analysis(file_path, filename, file_size, content_type, source="upload"):
    media_type = detect_media_type(content_type)
    start = time.time()
    result = await analyze_media(str(file_path), media_type, content_type)
    pt = round(time.time() - start, 3)
    file_id = str(uuid.uuid4())
    doc = {
        "_id": file_id, "filename": filename, "file_size": file_size,
        "content_type": content_type, "media_type": media_type.value, "source": source,
        "verdict": result["verdict"], "confidence": result["confidence"],
        "authenticity_score": result["authenticity_score"], "risk_level": result["risk_level"],
        "analysis_details": result["details"], "indicators": result["indicators"],
        "model_scores": result["model_scores"], "processing_time_seconds": pt,
        "created_at": datetime.utcnow().isoformat(), "file_path": str(file_path)
    }
    await db.analyses.insert_one(doc)
    doc["id"] = doc.pop("_id")
    del doc["file_path"]
    return doc


@app.get("/")
async def root():
    return {"message": "DeepShield API v4.0"}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/analyze")
async def analyze_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    allowed = {"image/jpeg","image/png","image/webp","image/gif","video/mp4","video/avi",
               "video/mov","video/webm","audio/mpeg","audio/wav","audio/ogg","audio/mp4"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported: {file.content_type}")
    fid = str(uuid.uuid4())
    fp = UPLOAD_DIR / f"{fid}{Path(file.filename).suffix}"
    content = await file.read()
    fp.write_bytes(content)
    result = await run_analysis(fp, file.filename, len(content), file.content_type)
    return JSONResponse(result)

@app.post("/api/analyze-url")
async def analyze_url_endpoint(body: dict):
    import httpx, mimetypes
    url = body.get("url","").strip()
    if not url: raise HTTPException(400, "URL required")
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent":"DeepShield/4.0"})
            r.raise_for_status()
    except Exception as e:
        raise HTTPException(400, f"Fetch failed: {e}")
    ct = r.headers.get("content-type","").split(";")[0].strip()
    if not any(ct.startswith(p) for p in ("image/","video/","audio/")):
        raise HTTPException(400, f"Not media: {ct}")
    ext = mimetypes.guess_extension(ct) or ".bin"
    fp = UPLOAD_DIR / f"url_{uuid.uuid4()}{ext}"
    fp.write_bytes(r.content)
    fname = url.split("/")[-1].split("?")[0] or f"url_media{ext}"
    result = await run_analysis(fp, fname, len(r.content), ct, "url")
    if fp.exists(): fp.unlink()
    return JSONResponse(result)

@app.post("/api/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    content = await file.read()
    fp = UPLOAD_DIR / f"frame_{uuid.uuid4()}.jpg"
    fp.write_bytes(content)
    result = await run_analysis(fp, "webcam_frame.jpg", len(content), "image/jpeg", "webcam")
    if fp.exists(): fp.unlink()
    return JSONResponse(result)

@app.get("/api/analyses")
async def get_analyses(limit: int = 50, skip: int = 0):
    cursor = db.analyses.find({},{"file_path":0}).sort("created_at",-1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = doc.pop("_id"); results.append(doc)
    total = await db.analyses.count_documents({})
    return {"total": total, "results": results}

@app.get("/api/analyses/{aid}")
async def get_analysis(aid: str):
    doc = await db.analyses.find_one({"_id": aid},{"file_path":0})
    if not doc: raise HTTPException(404,"Not found")
    doc["id"] = doc.pop("_id"); return doc

@app.delete("/api/analyses/{aid}")
async def delete_analysis(aid: str):
    r = await db.analyses.delete_one({"_id": aid})
    if r.deleted_count == 0: raise HTTPException(404,"Not found")
    return {"message":"Deleted"}

@app.get("/api/stats")
async def get_stats():
    total = await db.analyses.count_documents({})
    dp    = await db.analyses.count_documents({"verdict":"deepfake"})
    au    = await db.analyses.count_documents({"verdict":"authentic"})
    su    = await db.analyses.count_documents({"verdict":"suspicious"})
    by_t  = {m: await db.analyses.count_documents({"media_type":m}) for m in ["image","video","audio"]}
    agg   = await db.analyses.aggregate([{"$group":{"_id":None,"avg":{"$avg":"$confidence"}}}]).to_list(1)
    return {"total_analyses":total,"deepfakes_detected":dp,"authentic_media":au,
            "suspicious_media":su,"by_media_type":by_t,
            "average_confidence":round(agg[0]["avg"],2) if agg else 0,
            "detection_rate":round(dp/total*100,1) if total else 0}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)