from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import average_precision_score, confusion_matrix, roc_auc_score


def build_evaluation_report(y_true: np.ndarray, probabilities: np.ndarray, output_path: Path) -> dict:
    predictions = (probabilities >= 0.5).astype(int)
    report = {
        "confusion_matrix": confusion_matrix(y_true, predictions).tolist(),
        "roc_auc": float(roc_auc_score(y_true, probabilities)),
        "pr_auc": float(average_precision_score(y_true, probabilities)),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
