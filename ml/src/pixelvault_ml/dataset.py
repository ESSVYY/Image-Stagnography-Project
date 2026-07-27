from __future__ import annotations

import csv
import hashlib
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image


@dataclass(slots=True)
class DatasetRow:
    source_id: str
    sample_id: str
    path: str
    label: int
    density: int
    split: str


def iter_image_paths(root: Path) -> Iterable[Path]:
    for extension in ("*.png", "*.jpg", "*.jpeg", "*.bmp", "*.webp"):
        yield from root.rglob(extension)


def _load_rgb(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"))


def _embed_density(rgb: np.ndarray, density: int, seed: int) -> np.ndarray:
    if density <= 0:
        return rgb.copy()

    rng = random.Random(seed)
    encoded = rgb.copy()
    height, width, _ = encoded.shape
    bit_count = int(height * width * 3 * (density / 100))
    positions = list(range(height * width * 3))
    rng.shuffle(positions)
    for position in positions[:bit_count]:
        pixel = position // 3
        channel = position % 3
        row = pixel // width
        col = pixel % width
        encoded[row, col, channel] ^= 1
    return encoded


def build_dataset(source_dir: Path, output_dir: Path, densities: list[int]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    image_dir = output_dir / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.csv"

    rows: list[DatasetRow] = []
    for image_path in iter_image_paths(source_dir):
        source_id = hashlib.sha256(str(image_path).encode("utf-8")).hexdigest()[:16]
        rgb = _load_rgb(image_path)
        cover_name = f"{source_id}_cover.png"
        Image.fromarray(rgb).save(image_dir / cover_name)
        rows.append(DatasetRow(source_id, cover_name[:-4], str(image_dir / cover_name), 0, 0, "unassigned"))

        for density in densities:
            if density <= 0:
                continue
            encoded = _embed_density(rgb, density, seed=int(source_id[:8], 16) + density)
            sample_name = f"{source_id}_{density}.png"
            Image.fromarray(encoded).save(image_dir / sample_name)
            rows.append(DatasetRow(source_id, sample_name[:-4], str(image_dir / sample_name), 1, density, "unassigned"))

    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["source_id", "sample_id", "path", "label", "density", "split"])
        writer.writeheader()
        for row in rows:
          writer.writerow(row.__dict__)

    return manifest_path


def split_by_source(manifest_path: Path, seed: int = 42, train_ratio: float = 0.7, validation_ratio: float = 0.15):
    with manifest_path.open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    groups: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        groups.setdefault(row["source_id"], []).append(row)

    source_ids = list(groups)
    random.Random(seed).shuffle(source_ids)
    train_cutoff = int(len(source_ids) * train_ratio)
    validation_cutoff = int(len(source_ids) * (train_ratio + validation_ratio))
    partitions = {
        "train": set(source_ids[:train_cutoff]),
        "validation": set(source_ids[train_cutoff:validation_cutoff]),
        "test": set(source_ids[validation_cutoff:]),
    }

    for split, split_source_ids in partitions.items():
        for source_id in split_source_ids:
            for row in groups[source_id]:
                row["split"] = split

    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["source_id", "sample_id", "path", "label", "density", "split"])
        writer.writeheader()
        writer.writerows(rows)

    return partitions


def detect_duplicate_samples(manifest_path: Path):
    with manifest_path.open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    seen: dict[str, str] = {}
    duplicates: list[tuple[str, str]] = []
    for row in rows:
        image_hash = hashlib.sha256(Path(row["path"]).read_bytes()).hexdigest()
        if image_hash in seen:
            duplicates.append((seen[image_hash], row["path"]))
        else:
            seen[image_hash] = row["path"]
    return duplicates
