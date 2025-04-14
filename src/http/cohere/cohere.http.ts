import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { CohereRequest } from "./request";
import { CohereEmbedResponse } from "./response";

export class CohereService {
    private client: AxiosInstance;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.COHERE_API_KEY;
        this.client = axios.create({
            baseURL: process.env.COHERE_API_HOST || 'https://api.cohere.com',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async embed(request: CohereRequest): Promise<CohereEmbedResponse> {
        const requestConfig: AxiosRequestConfig = {
            method: "POST",
            url: "/v2/embed",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            data: request.data,
        };
        const { data } = await this.client.request<CohereEmbedResponse>(requestConfig);
        return data;
    }
}

export default new CohereService();
