# Threat Model

## Assets

- Secret messages.
- File payloads.
- Passwords and derived keys.
- Encoded PNGs.

## Threats

- Image recompression, resizing, screenshots, and editing.
- Weak passwords and offline guessing.
- Malicious or curious recipients inspecting the image.
- False confidence in detector results.

## Assumptions

- The browser environment is honest and the client device is not compromised.
- The user understands that concealment is not the same as confidentiality.
- The user provides a strong password.

## Mitigations

- AES-256-GCM authenticated encryption.
- Random salt and IV.
- Versioned payload headers with integrity checks.
- Size and dimension limits.
- Restricted backend upload handling.
