import type { PortfolioHistoryPoint, PortfolioSnapshot } from '../support/types';
import { apiClient } from './api.config';

class PortfolioService {
    getPortfolio = (): Promise<PortfolioSnapshot> => apiClient.get('/api/portfolio');
    getHistory = (): Promise<PortfolioHistoryPoint[]> => apiClient.get('/api/portfolio/history');
}

export const portfolioService = new PortfolioService();
