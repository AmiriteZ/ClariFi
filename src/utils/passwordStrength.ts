export type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  color: string;
};

export function getPasswordStrength(pw: string): Strength {
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (!pw) return { score: 0, label: "Very weak", color: "red-500" };

  // 🔒 Enforce minimum length first
  if (pw.length < 12) {
    return { score: 0, label: "Very weak", color: "red-500" };
  }

  const length = pw.length >= 12 ? 2 : pw.length >= 8 ? 1 : 0;
  const lower = /[a-z]/.test(pw) ? 1 : 0;
  const upper = /[A-Z]/.test(pw) ? 1 : 0;
  const number = /[0-9]/.test(pw) ? 1 : 0;
  const symbol = /[^A-Za-z0-9]/.test(pw) ? 1 : 0;

  const variety = lower + upper + number + symbol;
  let raw = length + Math.min(variety, 3);
  if (variety >= 3 && pw.length >= 12) raw += 1;

  score = Math.max(0, Math.min(4, raw)) as Strength["score"];

  const map: Record<Strength["score"], Strength> = {
    0: { score: 0, label: "Very weak", color: "red-500" },
    1: { score: 1, label: "Weak", color: "orange-500" },
    2: { score: 2, label: "Fair", color: "yellow-500" },
    3: { score: 3, label: "Strong", color: "green-500" },
    4: { score: 4, label: "Very strong", color: "emerald-600" },
  };
  return map[score];
}
