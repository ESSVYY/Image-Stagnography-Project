export function formatBytes(value: number) {
  if (!Number.isFinite(value)) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
