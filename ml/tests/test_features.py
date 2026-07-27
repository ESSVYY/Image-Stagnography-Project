from __future__ import annotations

import numpy as np

from pixelvault_ml.features import extract_statistical_features


def test_extract_statistical_features_shape():
    image = np.zeros((32, 32, 3), dtype=np.uint8)
    features = extract_statistical_features(image)
    assert features.vector.ndim == 1
    assert len(features.vector) == len(features.names)
    assert len(features.vector) > 0
