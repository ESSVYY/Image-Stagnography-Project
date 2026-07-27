from __future__ import annotations

import argparse
from pathlib import Path

def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark PixelVault inference latency.")
    parser.add_argument("--model", type=Path, required=True)
    args = parser.parse_args()
    print(f"Benchmark placeholder for model {args.model}")


if __name__ == "__main__":
    main()
