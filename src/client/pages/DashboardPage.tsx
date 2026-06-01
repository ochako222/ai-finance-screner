import AiPanel from '../components/AiPanel';
import AllocationChart from '../components/AllocationChart';
import CryptoTable from '../components/CryptoTable';
import DynamicsChart from '../components/DynamicsChart';
import Header from '../components/Header';
import StocksTable from '../components/StocksTable';
import SummaryCards from '../components/SummaryCards';
import { usePortfolio, usePortfolioHistory, useSync } from '../hooks/usePortfolio';
import { useAppStore } from '../store/appStore';

export default function DashboardPage() {
    const { data, isLoading } = usePortfolio();
    const { data: history } = usePortfolioHistory();
    const { sync } = useSync();
    const { isSyncing, openPanel, syncError } = useAppStore();

    if (isLoading) return <div className="loading">Loading portfolio…</div>;

    return (
        <div className="dashboard">
            <Header
                lastSync={data?.capturedAt ?? null}
                onSync={sync}
                onAdvise={openPanel}
                isSyncing={isSyncing}
            />

            {!data && (
                <div className="error-banner">
                    {syncError ?? 'No portfolio data yet — click Synchronize to fetch.'}
                </div>
            )}

            {data && (
                <>
                    <SummaryCards data={data} />
                    <div className="dashboard__charts">
                        <AllocationChart data={data} />
                        <DynamicsChart history={history ?? []} />
                    </div>
                    <div className="dashboard__table">
                        <StocksTable positions={data.trading212.positions} />
                    </div>
                    <div className="dashboard__table">
                        <CryptoTable data={data.binance} />
                    </div>
                </>
            )}

            <AiPanel />
        </div>
    );
}
