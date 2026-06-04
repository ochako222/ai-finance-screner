import AiPanel from '../components/AiPanel';
import AllocationChart from '../components/AllocationChart';
import CryptoTable from '../components/CryptoTable';
import DynamicsChart from '../components/DynamicsChart';
import Header from '../components/Header';
import HeroOverview from '../components/HeroOverview';
import PortfolioBalance from '../components/PortfolioBalance';
import StocksTable from '../components/StocksTable';
import { usePortfolio, usePortfolioHistory, useSync } from '../hooks/usePortfolio';
import { useAppStore } from '../store/appStore';

export default function DashboardPage() {
    const { data, isLoading } = usePortfolio();
    const { data: history } = usePortfolioHistory();
    const { sync } = useSync();
    const { isSyncing, openPanel, syncError, analysisResult } = useAppStore();

    if (isLoading) return <div className="loading">Loading portfolio…</div>;

    return (
        <>
            <Header
                exchangeRate={data?.exchangeRate ?? null}
                onSync={sync}
                onAdvise={openPanel}
                isSyncing={isSyncing}
            />

            <main className="main">
                <div className="grid">
                    {!data && (
                        <div className="error-banner span-3">
                            {syncError ?? 'No portfolio data yet — click Synchronize to fetch.'}
                        </div>
                    )}

                    {data && (
                        <>
                            <HeroOverview data={data} />
                            <AllocationChart data={data} analysis={analysisResult} />
                            <PortfolioBalance data={data} />
                            <DynamicsChart history={history ?? []} />
                            <StocksTable positions={data.trading212.positions} />
                            <CryptoTable data={data.binance} />
                        </>
                    )}
                </div>
            </main>

            <AiPanel />
        </>
    );
}
