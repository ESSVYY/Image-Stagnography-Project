# PixelVault

PixelVault is a privacy-focused web application for hiding encrypted text or small files inside PNG images, recovering them with a password, comparing encoded images, and estimating whether an image may contain hidden data.

## Author

- Name: Saksham Varma
- GitHub: (https://github.com/ESSVYY)
- Why this was built: to explore privacy-first browser encryption, covert image storage, and honest ML-based steganalysis in a portfolio-ready full-stack project.

## Screenshots

Add final product screenshots here after running the app locally.

## Demo

Demo link placeholder: replace with the deployed Vercel and backend URLs.

## Features

- Hide encrypted text or file payloads in PNG images.
- Recover hidden content with password verification and integrity checks.
- Analyze images with a steganalysis detector estimate.
- Compare original and encoded images with quality metrics.
- Keep core steganography workflows browser-side and offline-friendly.
- Store usage statistics locally in the browser.

## Architecture

- Frontend: Next.js App Router, TypeScript, Tailwind CSS.
- Core crypto and stego engine: browser-side AES-256-GCM and LSB image embedding.
- Optional backend: FastAPI detector API.
- ML pipeline: Python dataset generation, baseline models, CNN training, evaluation, and calibration.

## Technology Stack

- Next.js
- TypeScript
- Tailwind CSS
- Web Crypto API
- Canvas API
- FastAPI
- PyTorch
- scikit-learn
- Pytest
- Ruff
- Vitest
- Playwright

## Local Setup

1. Install Node.js 20+ and Python 3.12+.
2. Install frontend dependencies inside `apps/web`.
3. Create and activate a Python environment for `apps/api` and `ml`.
4. Copy `.env.example` to `.env` and adjust values if needed.

## Commands

### Frontend

```bash
npm --prefix apps/web run dev
npm --prefix apps/web run build
npm --prefix apps/web run lint
```

### Backend

```bash
python -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### ML

```bash
python -m ml.scripts.generate_dataset
python -m ml.scripts.train_baseline
python -m ml.scripts.train_cnn
python -m ml.scripts.evaluate
```

### Testing

```bash
npm run build:web
python -m pytest apps/api/tests
python -m pytest ml/tests
```

## Security Model

- Client-side encryption for hide and extract.
- AES-256-GCM authenticated encryption.
- Random salts and IVs.
- File validation, size limits, and no secret logging.
- CORS restrictions and secure response headers in the API.

## Privacy Policy

PixelVault does not require an account for the main hide/extract workflow. Uploaded secret content should remain on the client whenever possible, and the backend should not permanently store payloads.

## Known Limitations

- PNG round-trips are required for reliable LSB payloads.
- JPEG, screenshots, resizing, and social-media compression can destroy hidden data.
- The detector can produce false positives and false negatives.
- The ML model card remains marked as not evaluated until local training is run.

## Roadmap

- Train the detector on a broader open dataset.
- Improve explainability and calibration.
- Add optional server-side preview validation for large uploads.
- Expand deployment and observability guidance.

## Contribution

See `CONTRIBUTING.md`.

## License

See `LICENSE`.
