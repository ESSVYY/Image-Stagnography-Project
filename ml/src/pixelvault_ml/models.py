from __future__ import annotations

from dataclasses import dataclass

import joblib
import numpy as np
import torch
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .features import extract_statistical_features


@dataclass(slots=True)
class BaselineBundle:
    model: object
    feature_names: list[str]
    metrics: dict[str, float]


def train_baseline_models(images: list[np.ndarray], labels: list[int], random_state: int = 42) -> BaselineBundle:
    feature_sets = [extract_statistical_features(image) for image in images]
    matrix = np.vstack([feature.vector for feature in feature_sets])
    X_train, X_test, y_train, y_test = train_test_split(matrix, labels, test_size=0.2, random_state=random_state, stratify=labels)

    candidates = {
        "logistic_regression": Pipeline([
            ("scale", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=random_state)),
        ]),
        "random_forest": RandomForestClassifier(n_estimators=200, max_depth=10, random_state=random_state, class_weight="balanced"),
        "gradient_boosting": GradientBoostingClassifier(random_state=random_state),
    }

    best_name = "logistic_regression"
    best_model = None
    best_score = -1.0
    best_metrics: dict[str, float] = {}

    for name, model in candidates.items():
        model.fit(X_train, y_train)
        probabilities = _predict_probabilities(model, X_test)
        predictions = (probabilities >= 0.5).astype(int)
        score = f1_score(y_test, predictions)
        if score > best_score:
            best_score = score
            best_name = name
            best_model = model
            best_metrics = {
                "accuracy": accuracy_score(y_test, predictions),
                "precision": precision_score(y_test, predictions, zero_division=0),
                "recall": recall_score(y_test, predictions, zero_division=0),
                "f1_score": f1_score(y_test, predictions),
                "roc_auc": roc_auc_score(y_test, probabilities),
            }

    calibrated = CalibratedClassifierCV(best_model, cv=3, method="sigmoid")
    calibrated.fit(X_train, y_train)
    return BaselineBundle(model=calibrated, feature_names=feature_sets[0].names, metrics={"model_name": best_name, **best_metrics})


def _predict_probabilities(model, features: np.ndarray) -> np.ndarray:
    if hasattr(model, "predict_proba"):
        return model.predict_proba(features)[:, 1]
    decision = model.decision_function(features)
    return 1 / (1 + np.exp(-decision))


class SimpleStegoCNN(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.network = torch.nn.Sequential(
            torch.nn.Conv2d(3, 16, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.MaxPool2d(2),
            torch.nn.Conv2d(16, 32, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.MaxPool2d(2),
            torch.nn.Conv2d(32, 64, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = torch.nn.Sequential(
            torch.nn.Flatten(),
            torch.nn.Linear(64, 32),
            torch.nn.ReLU(),
            torch.nn.Linear(32, 1),
        )

    def forward(self, inputs):
        return self.classifier(self.network(inputs))


def export_model_artifact(model, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
