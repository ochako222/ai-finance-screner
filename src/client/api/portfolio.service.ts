import type { PortfolioSnapshot } from '../support/types';
import { apiClient } from './api.config';

class PortfolioService {
    getPortfolio = (): Promise<PortfolioSnapshot> => apiClient.get('/api/portfolio');
}

export const portfolioService = new PortfolioService();
