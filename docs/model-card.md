# PixelVault Model Card

## Model Name

PixelVault steganalysis detector

## Status

Development baseline. Not evaluated yet.

## Intended Use

- Estimate whether an image may contain hidden data.
- Support privacy education and research workflows.

## Inputs

- PNG or JPEG images.
- Image statistics and residual-style features.

## Outputs

- Probability estimate.
- Confidence estimate.
- Low / moderate / high likelihood category.

## Limitations

- False positives and false negatives are expected.
- Compression and resizing change the signal.
- It is not proof of steganography.
