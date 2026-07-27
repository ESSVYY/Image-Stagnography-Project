from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class Signal(BaseModel):
    label: str
    value: str


class Statistic(BaseModel):
    label: str
    value: str


class AnalysisResponse(BaseModel):
    probability: float
    confidence: float
    category: str
    model_version: str
    model_status: str
    signals: list[Signal]
    statistics: list[Statistic]
    limitations: list[str]
    width: int
    height: int
    file_size: int


class ModelInfoResponse(BaseModel):
    version: str
    status: str
    trained_at: str | None = None
    artifact_path: str | None = None
    average_latency_ms: float | None = None
    input_requirements: str
    limitations: list[str]
