from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np
from PIL import Image

from pixelvault_ml.models import export_model_artifact, train_baseline_models


def _load_dataset(manifest_path: Path):
    images: list[np.ndarray] = []
    labels: list[int] = []
    with manifest_path.open("r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            images.append(np.asarray(Image.open(row["path"]).convert("RGB")))
            labels.append(int(row["label"]))
    return images, labels


def main() -> None:
    parser = argparse.ArgumentParser(description="Train PixelVault baseline steganalysis models.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, default=Path("ml/models/pixelvault_baseline.joblib"))
    parser.add_argument("--metrics", type=Path, default=Path("ml/models/baseline_metrics.json"))
    args = parser.parse_args()

    images, labels = _load_dataset(args.manifest)
    bundle = train_baseline_models(images, labels)
    export_model_artifact(bundle.model, args.artifact)
    args.metrics.parent.mkdir(parents=True, exist_ok=True)
    args.metrics.write_text(__import__("json").dumps(bundle.metrics, indent=2), encoding="utf-8")
    print(f"Baseline model saved to {args.artifact}")


if __name__ == "__main__":
    main()
