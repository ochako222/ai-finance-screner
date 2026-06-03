import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { PortfolioHistoryPoint } from '../support/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const LINE_COLOR = '#cba6f7'; // mauve
const AREA_COLOR = 'rgba(203, 166, 247, 0.25)';
const GRID_COLOR = '#313244'; // surface0
const TICK_COLOR = '#6c7086'; // overlay0
const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";

interface Props {
    history: PortfolioHistoryPoint[];
}

function fmtPln(n: number) {
    return `${n.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł`;
}

function shortDate(iso: string) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
}

export default function DynamicsChart({ history }: Props) {
    if (history.length === 0) {
        return (
            <section className="tile">
                <div className="tile__head">
                    <div className="tile__title">
                        <span className="glyph">∿</span> Portfolio Dynamics
                    </div>
                </div>
                <p style={{ color: 'var(--overlay1)', fontSize: '12px', fontStyle: 'italic' }}>
                    No sync history yet. Sync to start tracking.
                </p>
            </section>
        );
    }

    const labels = history.map((p) => shortDate(p.capturedAt));
    const values = history.map((p) => p.totalPln);

    const first = shortDate(history[0].capturedAt);
    const last = shortDate(history[history.length - 1].capturedAt);
    const rangeLabel = first === last ? first : `${first} → ${last}`;

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                borderColor: LINE_COLOR,
                backgroundColor: AREA_COLOR,
                pointBackgroundColor: LINE_COLOR,
                pointStrokeColor: '#1e1e2e',
                fill: true,
                tension: 0.3,
                borderWidth: 2.2,
                pointRadius: history.length === 1 ? 4 : 3
            }
        ]
    };

    return (
        <section className="tile">
            <div className="tile__head">
                <div className="tile__title">
                    <span className="glyph">∿</span> Portfolio Dynamics
                </div>
                <span className="label">{rangeLabel}</span>
            </div>
            <div className="dynamics-chart">
                <Line
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => ` ${fmtPln(Number(ctx.raw))}`
                                },
                                bodyFont: { family: MONO_FONT, size: 12 },
                                titleFont: { family: MONO_FONT, size: 11 }
                            }
                        },
                        scales: {
                            x: {
                                grid: { color: GRID_COLOR },
                                ticks: { color: TICK_COLOR, font: { size: 10, family: MONO_FONT } }
                            },
                            y: {
                                grid: { color: GRID_COLOR },
                                ticks: {
                                    color: TICK_COLOR,
                                    font: { size: 10, family: MONO_FONT },
                                    callback: (v) => fmtPln(Number(v))
                                }
                            }
                        }
                    }}
                />
            </div>
        </section>
    );
}
