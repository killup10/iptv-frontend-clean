const PLAN_WEIGHTS = {
  gratuito: 0,
  free: 0,
  free_preview: 0,
  gplay: 1,
  basico: 1,
  basic: 1,
  estandar: 2,
  standard: 2,
  sports: 3,
  cinefilo: 4,
  premium: 5,
  admin: 999,
};

const PLAN_LABELS = {
  gratuito: 'Gratis',
  free_preview: 'Gratis',
  gplay: 'GPlay',
  basico: 'GPlay',
  estandar: 'Estandar',
  sports: 'Sports',
  cinefilo: 'Cinefilo',
  premium: 'Premium',
};

const SECTION_REQUIRED_PLANS = {
  CINE_4K: ['premium', 'cinefilo'],
  CINE_60FPS: ['premium', 'cinefilo'],
  CINE_2026: ['premium', 'cinefilo'],
  CINE_2025: ['premium', 'cinefilo'],
  TV_EN_VIVO: ['premium'],
  DORAMAS: ['estandar', 'premium', 'cinefilo'],
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizePlanKey(value) {
  const normalized = normalizeToken(value);
  if (!normalized) return 'gratuito';
  if (normalized === 'basico') return 'gplay';
  if (normalized === 'gratis') return 'gratuito';
  return normalized;
}

export function normalizeRequiredPlans(value) {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];
  return Array.from(new Set(values.map((plan) => normalizePlanKey(plan)).filter(Boolean)));
}

export function getPlanWeight(value) {
  const normalized = normalizePlanKey(value);
  return PLAN_WEIGHTS[normalized] ?? 0;
}

export function getPlanLabel(value) {
  const normalized = normalizePlanKey(value);
  return PLAN_LABELS[normalized] || normalized.toUpperCase();
}

export function getSectionRequiredPlans(sectionKey) {
  const normalized = String(sectionKey || '').trim().toUpperCase().replace(/-/g, '_');
  return normalizeRequiredPlans(SECTION_REQUIRED_PLANS[normalized] || []);
}

export function getItemRequiredPlans(item, fallbackPlans = []) {
  const explicitPlans = normalizeRequiredPlans(
    item?.requiredPlans
    || item?.requiresPlan
    || item?.requiredPlan
    || item?.planRequired,
  );

  if (explicitPlans.length > 0) {
    return explicitPlans;
  }

  const contextualPlans = getSectionRequiredPlans(
    item?.mainSection || item?.section || item?.categoryKey,
  );

  if (contextualPlans.length > 0) {
    return contextualPlans;
  }

  return normalizeRequiredPlans(fallbackPlans);
}

export function hasPlanAccess(userPlan, requiredPlans = []) {
  const normalizedRequiredPlans = normalizeRequiredPlans(requiredPlans);
  if (!normalizedRequiredPlans.length) {
    return true;
  }

  const userWeight = getPlanWeight(userPlan);
  const minimumRequiredWeight = Math.min(
    ...normalizedRequiredPlans.map((plan) => getPlanWeight(plan)),
  );

  return userWeight >= minimumRequiredWeight;
}

export function getAccessLockState(item, userPlan, options = {}) {
  const requiredPlans = getItemRequiredPlans(item, options.fallbackPlans || []);
  const locked = requiredPlans.length > 0 && !hasPlanAccess(userPlan, requiredPlans);
  const minimumPlan = requiredPlans.length
    ? requiredPlans.reduce((lowest, current) => (
      getPlanWeight(current) < getPlanWeight(lowest) ? current : lowest
    ))
    : '';

  return {
    locked,
    requiredPlans,
    minimumPlan,
    minimumPlanLabel: minimumPlan ? getPlanLabel(minimumPlan) : '',
    lockMessage: minimumPlan ? `Necesitas ${getPlanLabel(minimumPlan)} o superior` : 'Actualiza tu plan',
  };
}
