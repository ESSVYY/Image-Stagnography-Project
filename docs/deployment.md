# Deployment Guide

## Frontend

- Deploy `apps/web` to Vercel.
- Set `NEXT_PUBLIC_API_BASE_URL` to the detector API URL.

## Backend

- Deploy `apps/api` to Render, Hugging Face Spaces, or a comparable free tier.
- Keep the API stateless.
- Use environment variables for origins and model paths.

## ML Artifacts

- Store trained models under `ml/models/` or in a compatible artifact store.
- Keep evaluation reports and model cards versioned with the artifact.

## Verification

- Confirm the frontend build succeeds.
- Confirm the health endpoint returns `ok`.
- Confirm the detector returns structured JSON for a sample image.
