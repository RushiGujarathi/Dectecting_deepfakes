
=======
# DeepShield — AI Deepfake Detection System

> Multi-modal deepfake detection across images, video, and audio using ensemble AI models.

---

## 🚀 Quick Start (3 commands)

```bash
# 1. Clone / unzip project
cd deepfake-detector

# 2. Start everything (MongoDB + Backend + Frontend)
docker-compose up --build

# 3. Open browser
open http://localhost:5173
```

---

## 🏗 Architecture

```
deepfake-detector/
├── backend/
│   ├── main.py          # FastAPI app — all REST endpoints
│   ├── detector.py      # Detection engine (swap with real models)
│   ├── database.py      # MongoDB (motor async driver)
│   ├── models.py        # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root + nav routing
│   │   ├── App.css          # Full design system (dark cyberpunk)
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx    # Drag-drop upload + scan animation
│   │   │   ├── DashboardPage.jsx # Result visualization
│   │   │   └── HistoryPage.jsx   # MongoDB history table
│   │   └── utils/api.js     # All fetch calls
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml   # One-command full stack
```

---

## 🧠 Detection Pipeline

### Image
- **EfficientNet-B4** — face manipulation detection
- **Xception** — GAN artifact detection  
- **Frequency Analysis** — DCT domain anomalies
- **ELA (Error Level Analysis)** — compression inconsistencies
- **Grad-CAM** — highlights suspicious regions

### Video
- **Frame-level CNN** — per-frame classification
- **Temporal Analyzer** — inter-frame consistency
- **Face-Swap Detector** — boundary blending artifacts
- **Lip-Sync Checker** — audio-visual mismatch

### Audio
- **RawNet2** — end-to-end voice anti-spoofing
- **MFCC Classifier** — mel-frequency cepstral features
- **Prosody Analyzer** — intonation and rhythm patterns
- **Spectral Checker** — vocoder post-processing artifacts

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Upload & analyze a file |
| GET | `/api/analyses` | Get analysis history |
| GET | `/api/analyses/{id}` | Get single analysis |
| DELETE | `/api/analyses/{id}` | Delete analysis |
| GET | `/api/stats` | Aggregate statistics |
| GET | `/health` | Health check |

---

## 🗄 MongoDB Schema

```json
{
  "_id": "uuid-string",
  "filename": "photo.jpg",
  "file_size": 204800,
  "content_type": "image/jpeg",
  "media_type": "image",
  "verdict": "deepfake",
  "confidence": 0.94,
  "authenticity_score": 0.06,
  "risk_level": "critical",
  "analysis_details": { ... },
  "indicators": [ "Frequency domain anomalies detected" ],
  "model_scores": {
    "EfficientNet-B4": 0.92,
    "Xception": 0.89
  },
  "processing_time_seconds": 0.823,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## 🔧 Manual Setup (no Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Make sure MongoDB is running on localhost:27017
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🤖 Upgrading to Real Models

Replace the simulation functions in `detector.py` with real inference:

```python
# Install
pip install timm torch torchvision speechbrain transformers
pip install pytorch-grad-cam librosa opencv-python

# Image — real EfficientNet-B4
import timm, torch
model = timm.create_model('efficientnet_b4', pretrained=True, num_classes=2)
model.load_state_dict(torch.load('ff_efficientnet.pth'))

# Audio — real RawNet2
from speechbrain.pretrained import SpeakerRecognition
model = SpeakerRecognition.from_hparams("speechbrain/spkrec-ecapa-voxceleb")
```

Pre-trained weights (FaceForensics++): https://github.com/ondyari/FaceForensics

---

## 🏆 Hackathon Winning Features

- ✅ Multi-modal: image + video + audio
- ✅ Ensemble models with individual scores
- ✅ Confidence score + authenticity score  
- ✅ Risk levels: low / medium / high / critical
- ✅ Forensic indicators explaining the verdict
- ✅ MongoDB audit trail with full history
- ✅ Real-time statistics dashboard
- ✅ Dark cyberpunk UI — memorable and professional
- ✅ Docker one-command deployment
- ✅ RESTful API (judges can call it directly)
- ✅ Grad-CAM ready (heatmap infrastructure in place)
>>>>>>> 4f81271 (first commit)
# Dectecting_deepfakes
