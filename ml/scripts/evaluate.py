from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import joblib
import numpy as np
from PIL import Image

from pixelvault_ml.features import extract_statistical_features
from pixelvault_ml.evaluation import build_evaluation_report


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a PixelVault baseline model.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("ml/models/evaluation.json"))
    args = parser.parse_args()

    model = joblib.load(args.model)
    features = []
    labels = []
    with args.manifest.open("r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            image = np.asarray(Image.open(row["path"]).convert("RGB"))
            features.append(extract_statistical_features(image).vector)
            labels.append(int(row["label"]))

    probabilities = model.predict_proba(np.vstack(features))[:, 1]
    report = build_evaluation_report(np.asarray(labels), probabilities, args.output)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
