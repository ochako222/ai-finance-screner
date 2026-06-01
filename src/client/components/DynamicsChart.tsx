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

const LINE_COLOR = '#667eea'; // $accent
const GRID_COLOR = '#30363d'; // $border
const TICK_COLOR = '#8b949e'; // $text-muted

interface Props {
    history: PortfolioHistoryPoint[];
}

function fmtPln(n: number) {
    return n.toLocaleString('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        maximumFractionDigits: 0
    });
}

function shortDate(iso: string) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
}

export default function DynamicsChart({ history }: Props) {
    if (history.length === 0) {
        return (
            <div className="dynamics-chart">
                <h3 className="section-title">Portfolio Dynamics</h3>
                <p className="stub-notice">No sync history yet. Sync to start tracking.</p>
            </div>
        );
    }

    const labels = history.map((p) => shortDate(p.capturedAt));
    const values = history.map((p) => p.totalPln);

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                borderColor: LINE_COLOR,
                backgroundColor: `${LINE_COLOR}33`,
                pointBackgroundColor: LINE_COLOR,
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: history.length === 1 ? 6 : 3
            }
        ]
    };

    return (
        <div className="dynamics-chart">
            <h3 className="section-title">Portfolio Dynamics</h3>
            {history.length === 1 && (
                <p className="stub-notice" style={{ marginBottom: 8 }}>
                    Sync regularly to see your portfolio trend.
                </p>
            )}
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
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: GRID_COLOR },
                            ticks: { color: TICK_COLOR, font: { size: 11 } }
                        },
                        y: {
                            grid: { color: GRID_COLOR },
                            ticks: {
                                color: TICK_COLOR,
                                font: { size: 11 },
                                callback: (v) => fmtPln(Number(v))
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
