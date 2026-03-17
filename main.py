from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import uuid
import os
import time
import random
import shutil
from datetime import datetime
from pathlib import Path

from database import db
from models import AnalysisResult, MediaType, Verdict
from detector import analyze_media

app = FastAPI(title="DeepShield API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/")
async def root():
    return {"message": "DeepShield API is live", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/analyze")
async def analyze_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    # Validate file type
    allowed_types = {
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/avi", "video/mov", "video/webm",
        "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}"
        )

    # Save file
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Determine media type
    if file.content_type.startswith("image"):
        media_type = MediaType.IMAGE
    elif file.content_type.startswith("video"):
        media_type = MediaType.VIDEO
    else:
        media_type = MediaType.AUDIO

    # Run analysis
    start_time = time.time()
    result = await analyze_media(str(file_path), media_type, file.content_type)
    processing_time = round(time.time() - start_time, 3)

    # Build document
    doc = {
        "_id": file_id,
        "filename": file.filename,
        "file_size": len(content),
        "content_type": file.content_type,
        "media_type": media_type.value,
        "verdict": result["verdict"],
        "confidence": result["confidence"],
        "authenticity_score": result["authenticity_score"],
        "risk_level": result["risk_level"],
        "analysis_details": result["details"],
        "indicators": result["indicators"],
        "model_scores": result["model_scores"],
        "processing_time_seconds": processing_time,
        "created_at": datetime.utcnow().isoformat(),
        "file_path": str(file_path)
    }

    # Save to MongoDB
    await db.analyses.insert_one(doc)

    # Clean up file in background
    background_tasks.add_task(cleanup_file, str(file_path), delay=300)

    return JSONResponse({
        "id": file_id,
        "filename": file.filename,
        "media_type": media_type.value,
        "verdict": result["verdict"],
        "confidence": result["confidence"],
        "authenticity_score": result["authenticity_score"],
        "risk_level": result["risk_level"],
        "analysis_details": result["details"],
        "indicators": result["indicators"],
        "model_scores": result["model_scores"],
        "processing_time_seconds": processing_time,
        "created_at": doc["created_at"]
    })


@app.get("/api/analyses")
async def get_analyses(limit: int = 20, skip: int = 0):
    cursor = db.analyses.find(
        {},
        {"file_path": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)

    results = []
    async for doc in cursor:
        doc["id"] = doc.pop("_id")
        results.append(doc)

    total = await db.analyses.count_documents({})

    return {
        "total": total,
        "results": results,
        "limit": limit,
        "skip": skip
    }


@app.get("/api/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    doc = await db.analyses.find_one({"_id": analysis_id}, {"file_path": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    doc["id"] = doc.pop("_id")
    return doc


@app.get("/api/stats")
async def get_stats():
    total = await db.analyses.count_documents({})
    deepfakes = await db.analyses.count_documents({"verdict": "deepfake"})
    authentic = await db.analyses.count_documents({"verdict": "authentic"})
    suspicious = await db.analyses.count_documents({"verdict": "suspicious"})

    by_type = {}
    for mtype in ["image", "video", "audio"]:
        by_type[mtype] = await db.analyses.count_documents({"media_type": mtype})

    avg_pipeline = [
        {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence"}}}
    ]
    avg_result = await db.analyses.aggregate(avg_pipeline).to_list(1)
    avg_confidence = round(avg_result[0]["avg_confidence"], 2) if avg_result else 0

    return {
        "total_analyses": total,
        "deepfakes_detected": deepfakes,
        "authentic_media": authentic,
        "suspicious_media": suspicious,
        "by_media_type": by_type,
        "average_confidence": avg_confidence,
        "detection_rate": round((deepfakes / total * 100), 1) if total > 0 else 0
    }


@app.delete("/api/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str):
    result = await db.analyses.delete_one({"_id": analysis_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"message": "Deleted successfully"}


async def cleanup_file(file_path: str, delay: int = 300):
    await asyncio.sleep(delay)
    if os.path.exists(file_path):
        os.remove(file_path)


if __name__ == "__main__":
    import asyncio
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
