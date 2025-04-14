export interface CohereEmbedResponse {
    id: string;
    embeddings: {
        [embeddingType: string]: number[][];
    };
    texts: string[];
    meta: {
        api_version: {
            version: string;
            is_experimental: boolean;
        };
        billed_units: {
            input_tokens: number;
        };
        warnings?: string[];
    };
}