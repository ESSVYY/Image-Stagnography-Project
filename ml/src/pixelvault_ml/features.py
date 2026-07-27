from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np


@dataclass(slots=True)
class FeatureSet:
    vector: np.ndarray
    names: list[str]


def _entropy(values: np.ndarray) -> float:
    histogram, _ = np.histogram(values, bins=256, range=(0, 255), density=True)
    histogram = histogram[histogram > 0]
    return float(-(histogram * np.log2(histogram)).sum())


def _lsb_balance(values: np.ndarray) -> float:
    lsb = values.astype(np.uint8) & 1
    zero = float(np.sum(lsb == 0))
    one = float(np.sum(lsb == 1))
    total = max(1.0, zero + one)
    return abs(zero - one) / total


def _channel_correlation(channel_a: np.ndarray, channel_b: np.ndarray) -> float:
    a = channel_a.astype(np.float32).ravel()
    b = channel_b.astype(np.float32).ravel()
    if np.std(a) == 0 or np.std(b) == 0:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


def extract_statistical_features(rgb: np.ndarray) -> FeatureSet:
    image = rgb.astype(np.float32)
    red = image[:, :, 0]
    green = image[:, :, 1]
    blue = image[:, :, 2]
    gray = image.mean(axis=2)

    features: list[float] = []
    names: list[str] = []

    for label, channel in [("red", red), ("green", green), ("blue", blue)]:
        features.extend([
            float(channel.mean()),
            float(channel.std()),
            float(channel.var()),
            _entropy(channel),
            _lsb_balance(channel),
        ])
        names.extend([
            f"{label}_mean",
            f"{label}_std",
            f"{label}_var",
            f"{label}_entropy",
            f"{label}_lsb_balance",
        ])

    residual_h = float(np.mean(np.abs(red[:, 1:] - red[:, :-1]))) if red.shape[1] > 1 else 0.0
    residual_v = float(np.mean(np.abs(red[1:, :] - red[:-1, :]))) if red.shape[0] > 1 else 0.0
    gray_entropy = _entropy(gray)
    gray_std = float(gray.std())
    gray_mean = float(gray.mean())

    features.extend([
        residual_h,
        residual_v,
        gray_entropy,
        gray_std,
        gray_mean,
        _channel_correlation(red, green),
        _channel_correlation(red, blue),
        _channel_correlation(green, blue),
    ])
    names.extend([
        "residual_horizontal",
        "residual_vertical",
        "gray_entropy",
        "gray_std",
        "gray_mean",
        "corr_rg",
        "corr_rb",
        "corr_gb",
    ])

    return FeatureSet(vector=np.asarray(features, dtype=np.float32), names=names)


def source_hash(path: str) -> str:
    digest = hashlib.sha256(path.encode("utf-8")).hexdigest()
    return digest[:16]
