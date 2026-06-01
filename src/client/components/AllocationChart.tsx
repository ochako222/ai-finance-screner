import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { PortfolioSnapshot } from '../support/types';

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = [
    '#667eea',
    '#48bb78',
    '#f6c90e',
    '#fc8181',
    '#4fc3f7',
    '#ce93d8',
    '#ff8a65',
    '#80cbc4',
    '#a5d6a7',
    '#90a4ae'
];

interface Props {
    data: PortfolioSnapshot;
}

export default function AllocationChart({ data }: Props) {
    const items = [
        ...data.trading212.positions.map((p) => ({
            label: p.ticker.split('_')[0],
            value: p.value
        })),
        ...data.binance.assets.map((a) => ({
            label: a.symbol,
            value: a.valueUsd
        }))
    ]
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value);

    if (items.length === 0) {
        return (
            <div className="allocation-chart">
                <h3 className="section-title">Allocation</h3>
                <p className="stub-notice">No positions to chart.</p>
            </div>
        );
    }

    const chartData = {
        labels: items.map((i) => i.label),
        datasets: [
            {
                data: items.map((i) => i.value),
                backgroundColor: items.map((_, idx) => PALETTE[idx % PALETTE.length]),
                borderColor: '#161b22',
                borderWidth: 2
            }
        ]
    };

    const total = items.reduce((s, i) => s + i.value, 0);

    return (
        <div className="allocation-chart">
            <h3 className="section-title">Allocation</h3>
            <Doughnut
                data={chartData}
                options={{
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#e6edf3', font: { size: 11 }, padding: 10 }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const pct = ((Number(ctx.raw) / total) * 100).toFixed(1);
                                    return ` $${Number(ctx.raw).toFixed(2)} (${pct}%)`;
                                }
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
