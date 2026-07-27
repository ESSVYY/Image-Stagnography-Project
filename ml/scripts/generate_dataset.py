from __future__ import annotations

import argparse
from pathlib import Path

from pixelvault_ml.dataset import build_dataset, split_by_source


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate PixelVault steganography datasets.")
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--densities", type=int, nargs="*", default=[0, 5, 10, 25, 50, 75, 90])
    args = parser.parse_args()

    manifest = build_dataset(args.source_dir, args.output_dir, args.densities)
    split_by_source(manifest)
    print(f"Dataset manifest written to {manifest}")


if __name__ == "__main__":
    main()
