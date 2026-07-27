from __future__ import annotations

import argparse
from pathlib import Path

def main() -> None:
    parser = argparse.ArgumentParser(description="Export a PixelVault model artifact.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.write_bytes(args.input.read_bytes())
    print(f"Exported artifact to {args.output}")


if __name__ == "__main__":
    main()
