import type { BinanceData } from '../support/types';

interface Props {
    data: BinanceData;
}

function fmtUsd(n: number) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function CryptoTable({ data }: Props) {
    const isStub = data.assets.length === 0;

    return (
        <section className="tile span-3">
            <div className="tile__head">
                <div className="tile__title">
                    <span className="glyph">◈</span> Crypto · Binance
                </div>
                <span className="label">connector</span>
            </div>

            {isStub ? (
                <div className="crypto-stub">
                    <span className="crypto-stub__badge">STUB</span>
                    <span>
                        Binance connector not wired yet — add API keys in{' '}
                        <code style={{ color: 'var(--sky)' }}>config.toml</code> to surface crypto
                        holdings here.
                    </span>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th
                                    style={{
                                        textAlign: 'left',
                                        color: 'var(--overlay1)',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--surface0)'
                                    }}
                                >
                                    Symbol
                                </th>
                                <th
                                    style={{
                                        textAlign: 'right',
                                        color: 'var(--overlay1)',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--surface0)'
                                    }}
                                >
                                    Qty
                                </th>
                                <th
                                    style={{
                                        textAlign: 'right',
                                        color: 'var(--overlay1)',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--surface0)'
                                    }}
                                >
                                    Value (USD)
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.assets.map((a) => (
                                <tr key={a.symbol}>
                                    <td
                                        style={{
                                            fontWeight: 700,
                                            padding: '12px',
                                            fontSize: '13px',
                                            borderBottom:
                                                '1px solid color-mix(in oklab, var(--surface0) 55%, transparent)'
                                        }}
                                    >
                                        {a.symbol}
                                    </td>
                                    <td
                                        style={{
                                            textAlign: 'right',
                                            padding: '12px',
                                            fontSize: '13px',
                                            borderBottom:
                                                '1px solid color-mix(in oklab, var(--surface0) 55%, transparent)',
                                            fontVariantNumeric: 'tabular-nums'
                                        }}
                                    >
                                        {a.qty}
                                    </td>
                                    <td
                                        style={{
                                            textAlign: 'right',
                                            padding: '12px',
                                            fontSize: '13px',
                                            borderBottom:
                                                '1px solid color-mix(in oklab, var(--surface0) 55%, transparent)',
                                            fontVariantNumeric: 'tabular-nums'
                                        }}
                                    >
                                        {fmtUsd(a.valueUsd)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
