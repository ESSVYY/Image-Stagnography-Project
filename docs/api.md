# PixelVault API

Base URL: `http://localhost:8000`

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/model`
- `GET /api/v1/model/metrics`
- `POST /api/v1/detect`
- `POST /api/v1/analyze-image`

## Behavior

- Accepts PNG and JPEG uploads only.
- Rejects unsupported file signatures and oversized images.
- Processes images in memory and does not permanently store them.
- Returns a structured JSON response with probability, confidence, signals, statistics, and limitations.

## Security

- CORS is restricted to the configured frontend origins.
- Secure headers are returned on every response.
- Rate limiting is enforced per client IP in-memory.
