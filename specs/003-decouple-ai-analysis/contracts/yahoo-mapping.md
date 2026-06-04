# Contract: T212 → Yahoo Symbol Mapping & quoteType Translation

**Module**: `src/server/connectors/yahoo.ts`
**Functions covered**: `t212ToYahoo(t212Ticker: string): string`, `quoteTypeToAssetType(qt: string | null | undefined): 'ETF' | 'Stock' | 'Unknown'`

## Inputs

T212 tickers from `T212Position.ticker`. Empirical examples observed in the user's strategy notes:

- `AAPL_US_EQ` (Apple, NASDAQ)
- `VOO_US_EQ` (Vanguard S&P 500, NYSE Arca)
- `VWCE_GY_ETF` (Vanguard FTSE All-World UCITS Acc, Xetra)
- `CSPX_LN_ETF` (iShares Core S&P 500 UCITS Acc, LSE) — assumed `LN` aliases to `.L`
- `MEUD_PA_ETF` (Amundi Stoxx Europe 600 UCITS, Euronext Paris)
- `AGGH_LN_ETF` (iShares Core Global Aggregate Bond UCITS, LSE)

## Mapping rules

```text
1. base    = t212Ticker.split('_')[0]
2. country = t212Ticker.split('_')[1]  // may be undefined
3. suffix  = COUNTRY_TO_YAHOO[country]
4. return  = base + (suffix ?? '')
```

```ts
const COUNTRY_TO_YAHOO: Record<string, string> = {
    US: '',
    DE: '.DE',
    GY: '.DE',  // Xetra alt code seen in VWCE_GY_ETF
    GB: '.L',
    UK: '.L',
    LN: '.L',   // London alt code
    FR: '.PA',
    NL: '.AS',
    IT: '.MI',
    ES: '.MC'
};
```

Country segments not in the map → bare base symbol (Yahoo often resolves the US-listed equivalent; an unresolved symbol degrades to `asset_type = 'Unknown'`).

Inputs with no underscore (`AAPL`) → returned as-is.

## quoteType → assetType

```ts
function quoteTypeToAssetType(qt: string | null | undefined): 'ETF' | 'Stock' | 'Unknown' {
    if (qt === 'ETF') return 'ETF';
    if (qt === 'EQUITY') return 'Stock';
    return 'Unknown';
}
```

Yahoo also emits `MUTUALFUND`, `INDEX`, `CRYPTOCURRENCY`, `FUTURE`. None of these should ever surface from a Trading 212 holding (Trading 212 doesn't sell mutual funds, futures, or crypto on the equity account). They all fall through to `'Unknown'` deliberately — if one does appear it will be visibly flagged in the positions table rather than silently miscategorised.

## Test matrix (recommended Vitest cases)

| Input ticker      | Expected Yahoo symbol |
|-------------------|-----------------------|
| `AAPL_US_EQ`      | `AAPL`                |
| `VOO_US_EQ`       | `VOO`                 |
| `VWCE_GY_ETF`     | `VWCE.DE`             |
| `CSPX_LN_ETF`     | `CSPX.L`              |
| `MEUD_PA_ETF`     | `MEUD.PA`             |
| `AGGH_LN_ETF`     | `AGGH.L`              |
| `SAP_DE_EQ`       | `SAP.DE`              |
| `BARC_UK_EQ`      | `BARC.L`              |
| `ASML_NL_EQ`      | `ASML.AS`             |
| `ENI_IT_EQ`       | `ENI.MI`              |
| `IBE_ES_EQ`       | `IBE.MC`              |
| `XYZ_ZZ_EQ`       | `XYZ` (unmapped country falls back to bare) |
| `BAREXAMPLE`      | `BAREXAMPLE` (no underscore) |
