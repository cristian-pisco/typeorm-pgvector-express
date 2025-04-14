import axios, { AxiosInstance, AxiosRequestConfig, Method } from "axios";
import { Brain, BrainResult } from "./response";

export class JelouBrainService {
    private client: AxiosInstance;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.JELOU_BRAIN_API_KEY;
        this.client = axios.create({
            baseURL: process.env.JELOU_BRAIN_API_HOST || 'https://brain.jelou.ai',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async getPocketBrains(): Promise<BrainResult> {
        const requestConfig: AxiosRequestConfig = {
            method: "GET",
            url: "/api/v1/brains/pocket",
            params: {
                include: "routes.utterances"
            }
        };
        const { data } = await this.client.request<BrainResult>(requestConfig);
        return data;
    }
}

export default new JelouBrainService();
