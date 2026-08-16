import { createServiceClient } from '../supabase/serviceClient';

// NOTE: Google's free-tier model lineup changes frequently in 2026.
// This list should be treated as something to revisit periodically, not a permanent config.
export const AI_MODELS = [
  { name: 'gemini-3.5-flash', dailyLimit: 20, description: 'Default/Most capable, but only 20/day limit' },
  { name: 'gemini-3-flash-preview', dailyLimit: 1500, description: 'Primary fallback, ~1500/day free tier' },
  { name: 'gemini-3.1-flash-lite-preview', dailyLimit: 1500, description: 'Last resort/faster fallback' }
];

export class AllModelsExhaustedError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('All models are exhausted or blocked.');
    this.name = 'AllModelsExhaustedError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ParsedAiError {
  isQuotaError: boolean;
  isUnavailableError: boolean;
  statusCode: number | null;
  statusText: string | null;
  message: string;
  retryAfterSeconds: number | null;
}

export function parseGeminiError(e: unknown): ParsedAiError {
  const rawMessage = e instanceof Error ? e.message : String(e || '');
  const errObj = (e && typeof e === 'object') ? (e as Record<string, unknown>) : {};
  
  let statusCode: number | null = typeof errObj.status === 'number' ? errObj.status : (typeof errObj.code === 'number' ? errObj.code : null);
  let statusText: string | null = typeof errObj.status === 'string' ? errObj.status : null;
  let message = rawMessage;

  // Safely attempt to parse stringified JSON embedded in error message
  try {
    const firstBrace = rawMessage.indexOf('{');
    const lastBrace = rawMessage.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const parsed = JSON.parse(rawMessage.slice(firstBrace, lastBrace + 1));
      const innerErr = parsed.error || parsed;
      if (innerErr.code) statusCode = Number(innerErr.code);
      if (innerErr.status) statusText = String(innerErr.status);
      if (innerErr.message) message = String(innerErr.message);
    }
  } catch {
    // Non-JSON message; fall back to string matching
  }

  const upperRaw = (rawMessage + ' ' + (statusText || '') + ' ' + (statusCode || '')).toUpperCase();

  const isQuotaError =
    statusCode === 429 ||
    statusText === 'RESOURCE_EXHAUSTED' ||
    upperRaw.includes('429') ||
    upperRaw.includes('RESOURCE_EXHAUSTED') ||
    upperRaw.includes('QUOTA');

  const isUnavailableError =
    statusCode === 503 ||
    statusCode === 500 ||
    statusCode === 504 ||
    statusText === 'UNAVAILABLE' ||
    upperRaw.includes('503') ||
    upperRaw.includes('UNAVAILABLE') ||
    upperRaw.includes('HIGH DEMAND') ||
    upperRaw.includes('TEMPORARILY OVERLOADED');

  let retryAfterSeconds: number | null = null;
  const match = rawMessage.match(/retryDelay.*?([\d\.]+)s/) || rawMessage.match(/retry in ([\d\.]+)s/);
  if (match) {
    retryAfterSeconds = Math.ceil(parseFloat(match[1]));
  }

  return {
    isQuotaError,
    isUnavailableError,
    statusCode,
    statusText,
    message,
    retryAfterSeconds,
  };
}

export async function blockModelInDb(modelName: string, durationSeconds: number) {
  try {
    const supabase = createServiceClient();
    const blockUntil = new Date();
    blockUntil.setSeconds(blockUntil.getSeconds() + durationSeconds);
    await supabase.rpc('block_model', {
      p_model_name: modelName,
      p_blocked_until: blockUntil.toISOString()
    });
  } catch (err) {
    console.error(`[AI Models] Failed to block model ${modelName}:`, err);
  }
}

export async function getAvailableModel(
  userId: string, 
  excludeModels: string[] = [], 
  requestedModel?: string,
  hasCustomKey: boolean = false
) {
  const supabase = createServiceClient();

  // 1. Fetch user's preferred model
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_model')
    .eq('id', userId)
    .single();

  const preferredModelName = profile?.preferred_model || AI_MODELS[0].name;

  // 2. Reorder candidate models: preferred model first, then remaining
  const candidateModels = AI_MODELS.filter(m => !excludeModels.includes(m.name));
  const orderedModels = [
    ...candidateModels.filter(m => m.name === preferredModelName),
    ...candidateModels.filter(m => m.name !== preferredModelName)
  ];

  if (orderedModels.length === 0) {
    throw new AllModelsExhaustedError(60);
  }

  // 3. Custom Key Path: Bypass global ai_model_usage tracking completely.
  if (hasCustomKey) {
    if (requestedModel && !excludeModels.includes(requestedModel)) {
      return requestedModel;
    }
    return orderedModels[0].name;
  }

  // 4. Server Key Path: Enforce global rate limits via ai_model_usage table.
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

  if (requestedModel && !excludeModels.includes(requestedModel)) {
    const usage = usageMap.get(requestedModel);
    const isBlocked = usage?.blocked_until && new Date(usage.blocked_until) > new Date();
    const modelConfig = AI_MODELS.find(m => m.name === requestedModel);
    const limit = modelConfig?.dailyLimit ?? 1500;
    const isExhausted = usage && usage.request_count >= limit;

    if (!isBlocked && !isExhausted) {
      return requestedModel;
    }
  }

  let earliestReset = new Date();
  earliestReset.setHours(24, 0, 0, 0);

  for (const model of orderedModels) {
    const usage = usageMap.get(model.name);
    if (!usage) return model.name;

    const isBlocked = usage.blocked_until && new Date(usage.blocked_until) > new Date();
    const isExhausted = usage.request_count >= model.dailyLimit;

    if (!isBlocked && !isExhausted) {
      return model.name;
    }

    if (isBlocked) {
      const resetTime = new Date(usage.blocked_until);
      if (resetTime < earliestReset) earliestReset = resetTime;
    }
  }

  const secondsUntilReset = Math.max(1, Math.ceil((earliestReset.getTime() - Date.now()) / 1000));
  throw new AllModelsExhaustedError(secondsUntilReset);
}
