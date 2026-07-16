import { createServiceClient } from '../supabase/serviceClient';

// NOTE: Google's free-tier model lineup changes frequently in 2026.
// This list should be treated as something to revisit periodically, not a permanent config.
export const AI_MODELS = [
  { name: 'gemini-3-flash-preview', dailyLimit: 1500, description: 'Default, ~1500/day free tier' },
  { name: 'gemini-3.1-flash-lite-preview', dailyLimit: 1500, description: 'Secondary/faster fallback' },
  { name: 'gemini-3.5-flash', dailyLimit: 20, description: 'Most capable but only 20/day limit' }
];

export class AllModelsExhaustedError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('All models are exhausted or blocked.');
    this.name = 'AllModelsExhaustedError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function getAvailableModel(userId: string) {
  const supabase = createServiceClient();
  
  // 1. Fetch user's preferred model
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_model')
    .eq('id', userId)
    .single();

  const preferredModelName = profile?.preferred_model || AI_MODELS[0].name;

  // 2. Fetch current usage for all models today
  const today = new Date().toISOString().split('T')[0];
  const { data: usageData } = await supabase
    .from('ai_model_usage')
    .select('*')
    .eq('date', today);

  const usageMap = new Map();
  if (usageData) {
    for (const row of usageData) {
      usageMap.set(row.model_name, row);
    }
  }

  // 3. Reorder models: put preferred model first, then the rest in default order
  const orderedModels = [
    ...AI_MODELS.filter(m => m.name === preferredModelName),
    ...AI_MODELS.filter(m => m.name !== preferredModelName)
  ];

  // 4. Find the first available model
  let earliestReset = new Date();
  earliestReset.setHours(24, 0, 0, 0); // Default reset is midnight

  for (const model of orderedModels) {
    const usage = usageMap.get(model.name);
    if (!usage) return model.name; // No usage recorded yet, it's available

    const isBlocked = usage.blocked_until && new Date(usage.blocked_until) > new Date();
    const isExhausted = usage.request_count >= model.dailyLimit;

    if (!isBlocked && !isExhausted) {
      return model.name;
    }

    // Track the earliest reset time across all models for the error message
    if (isBlocked) {
      const resetTime = new Date(usage.blocked_until);
      if (resetTime < earliestReset) earliestReset = resetTime;
    }
  }

  // 5. If we get here, all models are exhausted or blocked
  const secondsUntilReset = Math.max(1, Math.ceil((earliestReset.getTime() - Date.now()) / 1000));
  throw new AllModelsExhaustedError(secondsUntilReset);
}
