from __future__ import annotations

import io
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from .schemas import HealthResponse, ModelInfoResponse, AnalysisResponse, Signal, Statistic

MAX_FILE_SIZE = 8 * 1024 * 1024
MAX_DIMENSION = 4096
RATE_WINDOW_SECONDS = 60
RATE_LIMIT = 30


@dataclass
class ModelSnapshot:
    version: str = "pixelvault-dev-baseline"
    trained_at: str | None = None
    status: str = "development-baseline"
    artifact_path: str = "ml/models/pixelvault_model.pt"
    average_latency_ms: float | None = None


app = FastAPI(
    title="PixelVault API",
    version="1.0.0",
    description="Privacy-first steganalysis and image-analysis API for PixelVault.",
)

allowed_origins = [origin.strip() for origin in os.getenv("PIXELVAULT_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

request_buckets: dict[str, deque[float]] = defaultdict(deque)
model_snapshot = ModelSnapshot()


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = request_buckets[client_ip]
    while bucket and now - bucket[0] > RATE_WINDOW_SECONDS:
        bucket.popleft()
    bucket.append(now)
    if len(bucket) > RATE_LIMIT and request.url.path.startswith("/api/v1/"):
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded."})

    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


def _validate_image_signature(contents: bytes) -> None:
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return
    if contents.startswith(b"\xff\xd8"):
        return
    raise HTTPException(status_code=400, detail="Only PNG and JPEG images are supported.")


def _load_image(contents: bytes) -> tuple[np.ndarray, Image.Image]:
    if len(contents) > MAX_FILE_SIZE:
      raise HTTPException(status_code=413, detail="Image exceeds the maximum allowed size.")

    _validate_image_signature(contents)
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to read the image.") from exc

    if image.width > MAX_DIMENSION or image.height > MAX_DIMENSION:
        raise HTTPException(status_code=400, detail="Image dimensions exceed the supported limit.")

    return np.asarray(image.convert("RGB")), image


def _score_features(rgb: np.ndarray) -> tuple[float, list[Signal], list[Statistic]]:
    flat = rgb.astype(np.float32)
    channels = [flat[:, :, index] for index in range(3)]
    lsb_balance = []
    channel_entropy = []
    for channel in channels:
        lsb = channel.astype(np.uint8) & 1
        zero = float(np.sum(lsb == 0))
        one = float(np.sum(lsb == 1))
        total = max(1.0, zero + one)
        lsb_balance.append(abs(zero - one) / total)
        histogram = np.bincount(channel.astype(np.uint8).ravel(), minlength=256).astype(np.float32)
        probabilities = histogram / max(1.0, histogram.sum())
        entropy = -float(np.sum(probabilities[probabilities > 0] * np.log2(probabilities[probabilities > 0])))
        channel_entropy.append(entropy)

    residual = np.mean(np.abs(flat[:, 1:, :] - flat[:, :-1, :])) if flat.shape[1] > 1 else 0.0
    entropy_average = float(np.mean(channel_entropy))
    lsb_average = float(np.mean(lsb_balance))
    score = 1 / (1 + np.exp(1.8 - (entropy_average * 0.45 + residual / 22 + lsb_average * 4.2)))
    score = float(min(0.98, max(0.02, score)))

    signals = [
        Signal(label="LSB balance drift", value=f"{lsb_average:.3f}"),
        Signal(label="Residual magnitude", value=f"{residual:.2f}"),
        Signal(label="Entropy", value=f"{entropy_average:.2f}"),
        Signal(label="Calibration status", value=model_snapshot.status),
    ]
    statistics = [
        Statistic(label="Width", value=str(rgb.shape[1])),
        Statistic(label="Height", value=str(rgb.shape[0])),
        Statistic(label="Pixels", value=str(rgb.shape[0] * rgb.shape[1])),
        Statistic(label="Channels", value="RGB"),
    ]
    return score, signals, statistics


def _build_response(contents: bytes) -> AnalysisResponse:
    rgb, image = _load_image(contents)
    probability, signals, statistics = _score_features(rgb)
    confidence = min(0.97, max(0.55, 0.58 + abs(probability - 0.5) * 0.82))
    category = "Low likelihood" if probability < 0.33 else "Moderate likelihood" if probability < 0.67 else "High likelihood"
    limitations = [
        "This is an estimate, not proof of hidden data.",
        "Compression, resizing, and screenshot capture can alter the result.",
        "The detector can produce false positives and false negatives.",
    ]
    return AnalysisResponse(
        probability=probability,
        confidence=confidence,
        category=category,
        model_version=model_snapshot.version,
        model_status=model_snapshot.status,
        signals=signals,
        statistics=statistics,
        limitations=limitations,
        width=image.width,
        height=image.height,
        file_size=len(contents),
    )


@app.get("/api/v1/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="pixelvault-api")


@app.get("/api/v1/model", response_model=ModelInfoResponse)
async def get_model_info():
    artifact_exists = Path(model_snapshot.artifact_path).exists()
    return ModelInfoResponse(
        version=model_snapshot.version,
        status=model_snapshot.status,
        trained_at=model_snapshot.trained_at,
        artifact_path=model_snapshot.artifact_path if artifact_exists else None,
        average_latency_ms=model_snapshot.average_latency_ms,
        input_requirements="PNG or JPEG image up to 8 MB and 4096 px per side.",
        limitations=[
            "Calibration and evaluation are pending until training completes.",
            "The detector should not be treated as proof of hidden content.",
        ],
    )


@app.get("/api/v1/model/metrics")
async def get_model_metrics():
    return {
        "dataset_version": "Not evaluated yet",
        "accuracy": None,
        "precision": None,
        "recall": None,
        "f1_score": None,
        "roc_auc": None,
        "pr_auc": None,
        "notes": "Run the ML training pipeline to generate real metrics and export an artifact.",
    }


@app.post("/api/v1/detect", response_model=AnalysisResponse)
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    return _build_response(contents)


@app.post("/api/v1/analyze-image", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    return _build_response(contents)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
