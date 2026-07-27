from __future__ import annotations

import argparse
from pathlib import Path

from pixelvault_ml.dataset import detect_duplicate_samples


def main() -> None:
    parser = argparse.ArgumentParser(description="Find duplicate PixelVault dataset samples.")
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    duplicates = detect_duplicate_samples(args.manifest)
    print(f"Found {len(duplicates)} duplicates")


if __name__ == "__main__":
    main()
