import type { SyncResult } from '../support/types';
import { apiClient } from './api.config';

class SyncService {
    sync = (): Promise<SyncResult> => apiClient.post('/api/sync');
}

export const syncService = new SyncService();
