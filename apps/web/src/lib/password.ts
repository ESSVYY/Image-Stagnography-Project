export interface PasswordStrength {
  score: number;
  label: string;
  colorClass: string;
  hints: string[];
}

export function assessPasswordStrength(password: string): PasswordStrength {
  const hints: string[] = [];
  let score = 0;

  if (password.length >= 12) score += 28;
  else if (password.length >= 8) score += 18;
  else if (password.length >= 4) score += 8;
  else hints.push("Use at least 12 characters for stronger protection.");

  if (/[a-z]/.test(password)) score += 10;
  else hints.push("Add lowercase letters.");
  if (/[A-Z]/.test(password)) score += 10;
  else hints.push("Add uppercase letters.");
  if (/\d/.test(password)) score += 12;
  else hints.push("Add numbers.");
  if (/[^A-Za-z0-9]/.test(password)) score += 18;
  else hints.push("Add symbols or punctuation.");
  if (/(.).*(\1).*(\1)/.test(password)) score -= 6;

  score = Math.min(100, Math.max(0, score));

  if (score >= 80) {
    return { score, label: "Strong", colorClass: "bg-emerald-400", hints: hints.slice(0, 1) };
  }

  if (score >= 55) {
    return { score, label: "Moderate", colorClass: "bg-amber-400", hints: hints.slice(0, 2) };
  }

  return { score, label: "Weak", colorClass: "bg-rose-400", hints: hints.slice(0, 3) };
}
