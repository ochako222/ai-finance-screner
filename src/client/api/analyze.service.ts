import type { AnalysisMeta } from '../support/types';

class AnalyzeService {
    openStream(
        onText: (fullText: string) => void,
        onDone: (meta: AnalysisMeta) => void,
        onError: () => void
    ): EventSource {
        const es = new EventSource('/api/analyze/stream');
        es.addEventListener('text', (e) => onText((e as MessageEvent<string>).data));
        es.addEventListener('done', (e) => {
            onDone(JSON.parse((e as MessageEvent<string>).data) as AnalysisMeta);
            es.close();
        });
        es.addEventListener('error', () => {
            onError();
            es.close();
        });
        es.addEventListener('close', () => es.close());
        return es;
    }
}

export const analyzeService = new AnalyzeService();
