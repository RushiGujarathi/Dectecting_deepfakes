from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime


class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"


class Verdict(str, Enum):
    AUTHENTIC = "authentic"
    DEEPFAKE = "deepfake"
    SUSPICIOUS = "suspicious"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnalysisResult(BaseModel):
    id: str
    filename: str
    file_size: int
    content_type: str
    media_type: MediaType
    verdict: Verdict
    confidence: float
    authenticity_score: float
    risk_level: RiskLevel
    analysis_details: Dict[str, Any]
    indicators: List[str]
    model_scores: Dict[str, float]
    processing_time_seconds: float
    created_at: str


class StatsResponse(BaseModel):
    total_analyses: int
    deepfakes_detected: int
    authentic_media: int
    suspicious_media: int
    by_media_type: Dict[str, int]
    average_confidence: float
    detection_rate: float
