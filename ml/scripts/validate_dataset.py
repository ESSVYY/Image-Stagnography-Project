from __future__ import annotations

import argparse
import csv
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a PixelVault dataset manifest.")
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    with args.manifest.open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert rows, "Manifest is empty"
    print(f"Validated {len(rows)} rows")


if __name__ == "__main__":
    main()
