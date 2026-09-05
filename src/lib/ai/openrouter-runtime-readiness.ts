const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterRuntimeReadiness {
  configured: boolean;
  authenticated: boolean;
  imageCatalogAvailable: boolean;
  videoCatalogAvailable: boolean;
}

async function fetchWithTimeout(url: string, apiKey: string, timeoutMs = 8_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://www.brandbox-ai.com',
        'X-OpenRouter-Title': 'BrandBox AI',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function catalogHasModels(url: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, apiKey);
    if (!response.ok) return false;
    const payload = await response.json() as { data?: unknown };
    return Array.isArray(payload.data) && payload.data.length > 0;
  } catch {
    return false;
  }
}

export async function getOpenRouterRuntimeReadiness(): Promise<OpenRouterRuntimeReadiness> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim() || '';
  if (!apiKey) {
    return {
      configured: false,
      authenticated: false,
      imageCatalogAvailable: false,
      videoCatalogAvailable: false,
    };
  }

  let authenticated = false;
  try {
    // Do not read or return the response body. The key endpoint can contain usage/limit metadata;
    // this readiness probe intentionally retains only the HTTP authentication result.
    const keyResponse = await fetchWithTimeout(`${OPENROUTER_BASE_URL}/key`, apiKey);
    authenticated = keyResponse.ok;
  } catch {
    authenticated = false;
  }

  if (!authenticated) {
    return {
      configured: true,
      authenticated: false,
      imageCatalogAvailable: false,
      videoCatalogAvailable: false,
    };
  }

  const [imageCatalogAvailable, videoCatalogAvailable] = await Promise.all([
    catalogHasModels(`${OPENROUTER_BASE_URL}/images/models`, apiKey),
    catalogHasModels(`${OPENROUTER_BASE_URL}/videos/models`, apiKey),
  ]);

  return {
    configured: true,
    authenticated: true,
    imageCatalogAvailable,
    videoCatalogAvailable,
  };
}
