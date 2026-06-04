import type { AnalysisMeta, AnalysisResult } from '../support/types';

class AnalyzeService {
    openStream(
        onAnalysis: (result: AnalysisResult) => void,
        onDone: (meta: AnalysisMeta) => void,
        onError: (message?: string) => void
    ): EventSource {
        const es = new EventSource('/api/analyze/stream');

        es.addEventListener('analysis', (e) => {
            try {
                onAnalysis(JSON.parse((e as MessageEvent<string>).data) as AnalysisResult);
            } catch {
                onError('Failed to parse analysis response');
            }
        });

        es.addEventListener('done', (e) => {
            onDone(JSON.parse((e as MessageEvent<string>).data) as AnalysisMeta);
            es.close();
        });

        es.addEventListener('error', (e) => {
            let message: string | undefined;
            try {
                message = JSON.parse((e as MessageEvent<string>).data)?.message;
            } catch {
                // native EventSource error (connection drop) has no data
            }
            onError(message);
            es.close();
        });

        es.addEventListener('close', () => es.close());

        return es;
    }
}

export const analyzeService = new AnalyzeService();
