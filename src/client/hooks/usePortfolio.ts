import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioService, syncService } from '../api';
import { useAppStore } from '../store/appStore';

export const PORTFOLIO_QUERY_KEY = ['portfolio'];
export const HISTORY_QUERY_KEY = ['portfolio', 'history'];

export function usePortfolio() {
    return useQuery({
        queryKey: PORTFOLIO_QUERY_KEY,
        queryFn: portfolioService.getPortfolio,
        retry: false
    });
}

export function usePortfolioHistory() {
    return useQuery({
        queryKey: HISTORY_QUERY_KEY,
        queryFn: portfolioService.getHistory,
        staleTime: 0,
        retry: false
    });
}

export function useSync() {
    const queryClient = useQueryClient();
    const { setSyncing, setSyncError } = useAppStore();

    const sync = async () => {
        setSyncing(true);
        setSyncError(null);
        try {
            const result = await syncService.sync();
            const t212Err = result.errors.trading212;
            if (t212Err) {
                setSyncError(`Trading 212 sync failed: ${t212Err}`);
            }
            await queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
            await queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    return { sync };
}
