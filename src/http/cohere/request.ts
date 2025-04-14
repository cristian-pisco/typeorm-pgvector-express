export type CohereInputType = "search_document" | "search_query" | "classification" | "clustering" | "image";

export type CohereModelSupported =
    | "embed-english-v3.0" //1024
    | "embed-multilingual-v3.0" //1024
    | "embed-english-light-v3.0" //384
    | "embed-multilingual-light-v3.0" //384
    | "embed-english-v2.0" //4096
    | "embed-english-light-v2.0" //1024
    | "embed-multilingual-v2.0"; //768;

export type CohereEmbeddingType = "float" | "int8" | "uint8" | "binary" | "ubinary";

export type CohereTruncation = "NONE" | "START" | "END";

export interface CohereEmbedRequest {
    model: CohereModelSupported;
    input_type: CohereInputType;
    embedding_types: CohereEmbeddingType[];
    texts?: string[];
    images?: string[];
    truncate?: CohereTruncation;
}

export interface CohereRequest {
    data: CohereEmbedRequest;
}
