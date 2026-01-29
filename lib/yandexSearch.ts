type UnknownRecord = Record<string, unknown>;

export interface WebSearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GenerativeSearchResult {
  summary?: string;
  sources: WebSearchSource[];
  raw?: unknown;
}

export interface WebPageContent {
  title: string;
  url: string;
  text: string;
}

const SEARCH_ENDPOINT = "https://searchapi.api.cloud.yandex.net/v2/web/search";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

const toText = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const normalizeUrl = (value: unknown): string | undefined => {
  const url = toText(value);
  if (!url) return undefined;
  return url;
};

const extractFromItems = (items: unknown): WebSearchSource[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;

      const url =
        normalizeUrl(record.url) ||
        normalizeUrl(record.link) ||
        normalizeUrl(record.href);
      const title =
        toText(record.title) || toText(record.name) || toText(record.heading);
      const snippet =
        toText(record.snippet) ||
        toText(record.headline) ||
        toText(record.text) ||
        toText(record.description) ||
        (Array.isArray(record.passages)
          ? toText(record.passages.join(" "))
          : undefined);

      if (!url || !title) return null;

      return { title, url, snippet };
    })
    .filter((item): item is WebSearchSource => Boolean(item));
};

const extractSources = (data: unknown): WebSearchSource[] => {
  if (!data || typeof data !== "object") return [];
  const record = data as UnknownRecord;

  return [
    ...extractFromItems(record.sources),
    ...extractFromItems(record.items),
    ...extractFromItems(record.documents),
    ...extractFromItems(record.docs),
    ...extractFromItems(record.results),
    ...extractFromItems((record.response as UnknownRecord | undefined)?.items),
    ...extractFromItems((record.response as UnknownRecord | undefined)?.documents),
    ...extractFromItems((record.response as UnknownRecord | undefined)?.docs),
    ...extractFromItems((record.response as UnknownRecord | undefined)?.results),
  ];
};

const extractSummary = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const record = data as UnknownRecord;
  const generative = record.generativeResponse as UnknownRecord | undefined;

  return (
    toText(generative?.text) ||
    toText(generative?.answer) ||
    toText(generative?.content) ||
    toText(generative?.summary) ||
    toText(record.summary) ||
    undefined
  );
};

const buildRequestBody = (query: string, limit: number, responseFormat?: string) => ({
  query: {
    searchType: "SEARCH_TYPE_RU",
    queryText: query,
  },
  folderId: process.env.SEARCH_API_YANDEX_FOLDER,
  userAgent: DEFAULT_USER_AGENT,
  pageSize: limit,
  useGenerativeResponse: true,
  ...(responseFormat ? { responseFormat } : {}),
});

const postSearch = async (body: UnknownRecord, apiKey: string, apiKeyId: string) => {
  return fetch(SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${apiKey}`,
      "X-API-Key-ID": apiKeyId,
    },
    body: JSON.stringify(body),
  });
};

const decodeRawData = (rawData: unknown): string | undefined => {
  const rawText = toText(rawData);
  if (!rawText) return undefined;
  try {
    return Buffer.from(rawText, "base64").toString("utf-8");
  } catch (error) {
    return undefined;
  }
};

const tryParseJson = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    return undefined;
  }
};

const extractSourcesFromHtml = (html: string): WebSearchSource[] => {
  const sources: WebSearchSource[] = [];
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match = anchorRegex.exec(html);

  while (match && sources.length < 10) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    if (
      title &&
      url &&
      !url.includes("yandex.") &&
      !url.includes("searchapi")
    ) {
      sources.push({ title, url });
    }
    match = anchorRegex.exec(html);
  }

  return sources;
};

const stripHtml = (html: string): string => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function fetchWebPagesContent(
  sources: WebSearchSource[],
  maxChars = 2000,
  timeoutMs = 8000
): Promise<WebPageContent[]> {
  const tasks = sources.map(async (source) => {
    try {
      const html = await fetchWithTimeout(source.url, timeoutMs);
      const text = stripHtml(html);
      return {
        title: source.title,
        url: source.url,
        text: text.slice(0, maxChars),
      };
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.all(tasks);
  return results.filter((item): item is WebPageContent => Boolean(item && item.text));
}

export async function fetchGenerativeSearch(
  query: string,
  limit: number
): Promise<GenerativeSearchResult> {
  const apiKey = process.env.SEARCH_API_KEY;
  const folderId = process.env.SEARCH_API_YANDEX_FOLDER;
  const apiKeyId = process.env.SEARCH_API_KEY_ID;

  if (!apiKey) {
    throw new Error("SEARCH_API_KEY is not configured");
  }
  if (!folderId) {
    throw new Error("SEARCH_API_YANDEX_FOLDER is not configured");
  }
  if (!apiKeyId) {
    throw new Error("SEARCH_API_KEY_ID is not configured");
  }

  const requestBody = buildRequestBody(query, limit, "FORMAT_HTML");
  let response = await postSearch(requestBody as UnknownRecord, apiKey, apiKeyId);

  if (!response.ok) {
    const errorText = await response.text();
    const isFormatError = errorText.includes("response_format");
    if (isFormatError) {
      const fallbackBody = buildRequestBody(query, limit);
      response = await postSearch(fallbackBody as UnknownRecord, apiKey, apiKeyId);
    }

    if (!response.ok) {
      const fallbackError = await response.text();
      throw new Error(
        `Yandex Search API error: ${response.status} ${response.statusText} ${fallbackError}`
      );
    }
  }

  const data = (await response.json()) as UnknownRecord;
  const responsePayload = data?.response as UnknownRecord | undefined;

  let summary = extractSummary(data);
  let sources = extractSources(data);

  const rawDataTopLevel = (data as UnknownRecord)?.rawData;
  const rawDataFromResponse = responsePayload?.rawData;
  const rawText =
    decodeRawData(rawDataFromResponse) || decodeRawData(rawDataTopLevel);

  if (!summary && sources.length === 0 && rawText) {
    if (rawText) {
      const parsed = tryParseJson(rawText);
      if (parsed) {
        summary = extractSummary(parsed);
        sources = extractSources(parsed);
      } else {
        sources = extractSourcesFromHtml(rawText);
      }
    }
  }

  const uniqueSources = Array.from(
    new Map(sources.map((source) => [source.url, source])).values()
  ).slice(0, limit);

  return {
    summary,
    sources: uniqueSources,
    raw: data,
  };
}
