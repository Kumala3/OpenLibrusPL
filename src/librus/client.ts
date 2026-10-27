// Talks to Librus Synergia's own JSON API, the one school-issued accounts use:
// synergia.librus.pl/gateway/api/2.0, behind a cookie session.
//
// The login is a port of librus-sdk's GatewayApi20AuthClient (MIT, see NOTICE),
// minus one thing: the SDK's first request uses redirect: 'manual'. A spec
// fetch hands back an opaque redirect for that (status 0, no Location), so here
// every request lets the platform follow redirects, which reaches the same page.
//
// fetch is a parameter so this file runs unchanged under Node (with a cookie
// jar) for testing. On Android, expo/fetch with credentials: 'include' stores
// cookies in the system CookieManager, so a session survives app restarts.

export type Credentials = { login: string; password: string };
export type FetchLike = (url: string, init?: any) => Promise<Response>;

const AUTH = 'https://api.librus.pl';
const SYNERGIA = 'https://synergia.librus.pl';
export const API = `${SYNERGIA}/gateway/api/2.0`;

// The headers the official mobile app sends, as librus-sdk sends them.
const APP_HEADERS = {
  origin: 'app://librus',
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LibrusMobileApp',
};

// Plain fields, not constructor parameter properties: Node's type stripping
// cannot run those, and this file is tested under Node.
export class LibrusError extends Error {
  readonly status?: number;
  readonly kind: 'auth' | 'http' | 'network';
  constructor(message: string, status?: number, kind: 'auth' | 'http' | 'network' = 'http') {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

export class LibrusClient {
  private readonly fetchImpl: FetchLike;
  constructor(fetchImpl: FetchLike) {
    this.fetchImpl = fetchImpl;
  }

  private async send(url: string, init: any = {}): Promise<Response> {
    try {
      return await this.fetchImpl(url, { credentials: 'include', ...init });
    } catch (e) {
      throw new LibrusError(`Brak połączenia (${String((e as Error)?.message ?? e)})`, undefined, 'network');
    }
  }

  async login({ login, password }: Credentials): Promise<void> {
    const step = async (url: string, init?: any) => {
      const r = await this.send(url, init);
      // A 5xx is Librus being down, not a wrong password: report it as such,
      // so the app does not stop syncing as if the login had been rejected.
      if (r.status >= 500) throw new LibrusError(`Librus nie odpowiada (HTTP ${r.status})`, r.status, 'http');
      if (!r.ok) throw new LibrusError('Logowanie nie powiodło się', r.status, 'auth');
      return r;
    };
    const authPage = `${AUTH}/OAuth/Authorization?client_id=46`;
    await step(`${SYNERGIA}/loguj/portalRodzina?v=${Date.now() / 1000}`, {
      headers: { Referer: 'https://portal.librus.pl/' },
    });
    await step(authPage);
    const form = new FormData();
    form.append('action', 'login');
    form.append('login', login);
    form.append('pass', password);
    await step(authPage, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Baner': baner(),
        Referer: authPage,
      },
      body: form,
    });
    // Twice, as the SDK does: the first call only sets up what the second completes.
    await step(`${AUTH}/OAuth/Authorization/PerformLogin?client_id=46`);
    await step(`${AUTH}/OAuth/Authorization/PerformLogin?client_id=46`);
    await step(`${AUTH}/OAuth/Authorization/Grant?client_id=46`);
    const info = await step(`${API}/Auth/TokenInfo`, { headers: { accept: 'application/json' } });
    await info.json();
  }

  async get<T = any>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${API}/${path}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.append(k, v);
    const r = await this.send(url.toString(), { headers: { ...APP_HEADERS, accept: 'application/json' } });
    if (!r.ok) throw new LibrusError(`${path}: HTTP ${r.status}`, r.status);
    return (await r.json()) as T;
  }

  /**
   * Reuse the stored cookie session if it still works, log in only if not.
   * Me is the probe: it is the first request of every sync anyway.
   */
  async me(credentials: () => Promise<Credentials | null>): Promise<any> {
    try {
      return await this.get('Me');
    } catch (e) {
      if (e instanceof LibrusError && e.kind === 'network') throw e;
      const creds = await credentials();
      if (!creds) throw new LibrusError('Zaloguj się ponownie', undefined, 'auth');
      await this.login(creds);
      return this.get('Me');
    }
  }
}

/** Librus's anti-bot header: two strings with every char code shifted by 20. */
function baner(): string {
  const enc = (s: string) => s.split('').map((c) => String.fromCharCode(c.charCodeAt(0) + 20)).join('');
  return `${enc(Math.random().toString())}_${enc(Date.now().toString())}`;
}
