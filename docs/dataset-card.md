# PixelVault Dataset Card

## Dataset Purpose

Train and evaluate steganalysis models on clean and encoded image pairs.

## Data Sources

- Locally supplied images.
- Public open image datasets supplied by the user during training.

## Generation

- Clean cover images are preserved.
- Encoded variants are created at multiple payload densities.
- Split is performed by source image, not by generated sample.

## Safety Notes

- Do not include secrets, private photos, or sensitive datasets without permission.
- Store generated samples and manifests locally or in a controlled artifact store.
