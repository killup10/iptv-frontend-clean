import { getPlanLabel, normalizePlanKey } from "./planAccess.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseExpiryDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getStartOfLocalDay(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
}

export function getRemainingDaysUntilExpiration(expiresAt, now = new Date()) {
  const expiryDate = parseExpiryDate(expiresAt);
  if (!expiryDate) {
    return null;
  }

  const today = getStartOfLocalDay(now);
  const expiryDay = getStartOfLocalDay(expiryDate);
  return Math.ceil((expiryDay.getTime() - today.getTime()) / DAY_IN_MS);
}

export function getUserSubscriptionSummary(user, now = new Date()) {
  const normalizedPlan = normalizePlanKey(user?.plan || (user?.role === "admin" ? "admin" : "gratuito"));
  const planLabel = user?.role === "admin" && !user?.plan
    ? "Admin"
    : normalizedPlan === "admin"
      ? "Admin"
      : getPlanLabel(normalizedPlan);
  const remainingDays = getRemainingDaysUntilExpiration(user?.expiresAt, now);
  const expiresDate = parseExpiryDate(user?.expiresAt);

  let remainingLabel = "Sin vencimiento";
  if (remainingDays !== null) {
    if (remainingDays < 0) {
      remainingLabel = "Vencido";
    } else if (remainingDays === 0) {
      remainingLabel = "Vence hoy";
    } else if (remainingDays === 1) {
      remainingLabel = "1 dia restante";
    } else {
      remainingLabel = `${remainingDays} dias restantes`;
    }
  }

  return {
    planLabel,
    remainingDays,
    remainingLabel,
    expiresDate,
    expiresAt: user?.expiresAt || null,
  };
}
