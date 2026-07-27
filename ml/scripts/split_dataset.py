from __future__ import annotations

import argparse
from pathlib import Path

from pixelvault_ml.dataset import split_by_source


def main() -> None:
    parser = argparse.ArgumentParser(description="Split a PixelVault dataset by source image.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    split_by_source(args.manifest, seed=args.seed)
    print("Dataset split complete")


if __name__ == "__main__":
    main()
