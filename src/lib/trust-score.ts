/**
 * Trust score computation (0–100)
 *
 * Natural signals (max 80 pts):
 *  - Account age          : 20 pts
 *  - Total design saves   : 20 pts
 *  - Followers            : 10 pts
 *  - Profile completeness : 15 pts
 *  - Active designs       : 10 pts
 *  - No recent reports    : 10 pts (last 30 days)
 *  - Has reservations     :  5 pts   ← shows real activity
 *
 * Admin manual adjustment: stored as trust_score_manual (-30 … +20)
 * Final = clamp(natural + manual, 0, 100)
 */

export interface TrustInput {
  created_at: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  instagram?: string | null;
  followers_count?: number | null;
  total_likes: number;
  active_designs: number;
  recent_reports: number;
  has_reservations: boolean;
  trust_score_manual?: number | null;  // -100 … +100
  is_blocked?: boolean;
  is_verified?: boolean;               // manually granted by admin
}

export function computeTrustScore(input: TrustInput): {
  score: number;
  natural: number;
  breakdown: Record<string, number>;
} {
  if (input.is_blocked) return { score: 0, natural: 0, breakdown: {} };

  const now = Date.now();
  const ageMs = now - new Date(input.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // 1. Account age (20 pts)
  const ageScore =
    ageDays >= 365 ? 20 :
    ageDays >= 180 ? 15 :
    ageDays >= 90  ? 10 :
    ageDays >= 30  ? 5 : 2;

  // 2. Total saves (20 pts)
  const savesScore =
    input.total_likes >= 60 ? 20 :
    input.total_likes >= 30 ? 15 :
    input.total_likes >= 15 ? 10 :
    input.total_likes >= 5  ? 5  : 0;

  // 3. Followers (10 pts)
  const followers = input.followers_count ?? 0;
  const followersScore =
    followers >= 25 ? 10 :
    followers >= 10 ? 6  :
    followers >= 3  ? 3  : 0;

  // 4. Profile completeness (15 pts)
  const completeness =
    (input.avatar_url ? 4 : 0) +
    (input.bio        ? 4 : 0) +
    (input.city       ? 3 : 0) +
    (input.instagram  ? 4 : 0);

  // 5. Active designs (10 pts)
  const designsScore =
    input.active_designs >= 10 ? 10 :
    input.active_designs >= 5  ? 7  :
    input.active_designs >= 1  ? 3  : 0;

  // 6. No recent reports (10 pts)
  const reportsScore = input.recent_reports === 0 ? 10 : input.recent_reports === 1 ? 4 : 0;

  // 7. Has reservations (5 pts)
  const reservationsScore = input.has_reservations ? 5 : 0;

  const natural = ageScore + savesScore + followersScore + completeness + designsScore + reportsScore + reservationsScore;
  const manual  = input.trust_score_manual ?? 0;
  const score   = Math.min(100, Math.max(0, natural + manual));

  return {
    score,
    natural,
    breakdown: {
      age: ageScore,
      saves: savesScore,
      followers: followersScore,
      completeness,
      designs: designsScore,
      reports: reportsScore,
      reservations: reservationsScore,
      manual,
    },
  };
}

export function trustLabel(score: number, isVerified?: boolean): string {
  if (isVerified) return "Verificado";
  if (score >= 80)  return "Muy confiable";
  if (score >= 60)  return "Confiable";
  if (score >= 40)  return "En crecimiento";
  return "Nuevo";
}

export function trustColor(score: number, isVerified?: boolean): string {
  if (isVerified) return "text-amber-400";
  if (score >= 80)  return "text-emerald-400";
  if (score >= 60)  return "text-blue-400";
  if (score >= 40)  return "text-zinc-300";
  return "text-zinc-500";
}

export function trustRingClass(score: number, isVerified?: boolean): string {
  if (isVerified) return "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950";
  if (score >= 80)  return "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-zinc-950";
  if (score >= 60)  return "ring-2 ring-blue-400/60 ring-offset-2 ring-offset-zinc-950";
  if (score >= 40)  return "ring-2 ring-zinc-500/50 ring-offset-2 ring-offset-zinc-950";
  return "";
}
