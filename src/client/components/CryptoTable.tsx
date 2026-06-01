import type { BinanceData } from '../support/types';

interface Props {
    data: BinanceData;
}

export default function CryptoTable({ data }: Props) {
    return (
        <div className="panel">
            <h3 className="section-title">Crypto (Binance)</h3>
            {data.assets.length === 0 ? (
                <p className="stub-notice">{data.note ?? 'No crypto assets.'}</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Qty</th>
                            <th>Value (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.assets.map((a) => (
                            <tr key={a.symbol}>
                                <td style={{ fontWeight: 500 }}>{a.symbol}</td>
                                <td>{a.qty}</td>
                                <td>
                                    {a.valueUsd.toLocaleString('en-US', {
                                        style: 'currency',
                                        currency: 'USD'
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
