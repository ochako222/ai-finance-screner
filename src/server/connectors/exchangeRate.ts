import { fetch } from 'undici';

interface NbpResponse {
    rates: { mid: number; effectiveDate: string }[];
}

async function fetchFromNbp(url: string): Promise<number> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NBP API returned ${res.status}`);
    const json = (await res.json()) as NbpResponse;
    const rate = json.rates?.[0]?.mid;
    if (!rate) throw new Error('NBP API response missing rate');
    return rate;
}

// Returns PLN per 1 USD (e.g. 4.02).
export async function fetchPlnUsdRate(): Promise<number> {
    try {
        return await fetchFromNbp(
            'https://api.nbp.pl/api/exchangerates/rates/a/usd/today/?format=json'
        );
    } catch {
        return await fetchFromNbp(
            'https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json&last=1'
        );
    }
}
