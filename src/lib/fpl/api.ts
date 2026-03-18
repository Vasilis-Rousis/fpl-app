import "server-only";
import { FPL_BASE_URL } from "./constants";
import type {
  BootstrapStaticResponse,
  Fixture,
  ElementSummaryResponse,
  LiveGameweekResponse,
  ManagerResponse,
  ManagerHistoryResponse,
  ManagerPicksResponse,
  Transfer,
  H2HMatchesResponse,
  H2HStandingsResponse,
} from "./types";

// Queue-based rate limiter: ensures min 200ms between requests (safe for concurrency)
const MIN_INTERVAL_MS = 200;
let queue: Promise<void> = Promise.resolve();

async function rateLimitedFetch(url: string): Promise<Response> {
  // Chain onto the queue so concurrent calls are serialized with spacing
  const ticket = queue.then(
    () => new Promise<void>((r) => setTimeout(r, MIN_INTERVAL_MS))
  );
  queue = ticket;
  await ticket;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FPL-App/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`FPL API error: ${response.status} ${response.statusText} for ${url}`);
  }

  return response;
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await rateLimitedFetch(url);
      return (await response.json()) as T;
    } catch (error) {
      if (attempt === retries) throw error;
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("Unreachable");
}

// ============================================================
// Public API Functions
// ============================================================

export async function getBootstrapStatic(): Promise<BootstrapStaticResponse> {
  return fetchWithRetry<BootstrapStaticResponse>(`${FPL_BASE_URL}/bootstrap-static/`);
}

export async function getFixtures(): Promise<Fixture[]> {
  return fetchWithRetry<Fixture[]>(`${FPL_BASE_URL}/fixtures/`);
}

export async function getFixturesByGameweek(eventId: number): Promise<Fixture[]> {
  return fetchWithRetry<Fixture[]>(`${FPL_BASE_URL}/fixtures/?event=${eventId}`);
}

export async function getElementSummary(elementId: number): Promise<ElementSummaryResponse> {
  return fetchWithRetry<ElementSummaryResponse>(`${FPL_BASE_URL}/element-summary/${elementId}/`);
}

export async function getLiveGameweek(eventId: number): Promise<LiveGameweekResponse> {
  return fetchWithRetry<LiveGameweekResponse>(`${FPL_BASE_URL}/event/${eventId}/live/`);
}

export async function getManager(managerId: number): Promise<ManagerResponse> {
  return fetchWithRetry<ManagerResponse>(`${FPL_BASE_URL}/entry/${managerId}/`);
}

export async function getManagerHistory(managerId: number): Promise<ManagerHistoryResponse> {
  return fetchWithRetry<ManagerHistoryResponse>(`${FPL_BASE_URL}/entry/${managerId}/history/`);
}

export async function getManagerPicks(
  managerId: number,
  eventId: number
): Promise<ManagerPicksResponse> {
  return fetchWithRetry<ManagerPicksResponse>(
    `${FPL_BASE_URL}/entry/${managerId}/event/${eventId}/picks/`
  );
}

export async function getManagerTransfers(managerId: number): Promise<Transfer[]> {
  return fetchWithRetry<Transfer[]>(`${FPL_BASE_URL}/entry/${managerId}/transfers/`);
}

export async function getH2HMatches(
  leagueId: number,
  page = 1
): Promise<H2HMatchesResponse> {
  return fetchWithRetry<H2HMatchesResponse>(
    `${FPL_BASE_URL}/leagues-h2h-matches/league/${leagueId}/?page=${page}`
  );
}

export async function getH2HStandings(
  leagueId: number,
  page = 1
): Promise<H2HStandingsResponse> {
  return fetchWithRetry<H2HStandingsResponse>(
    `${FPL_BASE_URL}/leagues-h2h/${leagueId}/standings/?page=${page}`
  );
}

// Fetch all H2H matches across all pages
export async function getAllH2HMatches(leagueId: number): Promise<H2HMatchesResponse["results"]> {
  const allResults: H2HMatchesResponse["results"] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await getH2HMatches(leagueId, page);
    allResults.push(...response.results);
    hasNext = response.has_next;
    page++;
  }

  return allResults;
}
