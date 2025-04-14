import { Request, Response } from 'express';
import { formatResponse } from '../../utils';
import { EntityTarget, Repository } from 'typeorm';
import { getDataSource } from '../../database/app.datasource';
import cohereService from '../../http/cohere/cohere.http';
import { CohereRequest } from '../../http/cohere/request';
import pgvector from 'pgvector';
import embeddingService from '../../services/embedding.service';
import jelouBrainService from '../../http/jelou/jelou-brain.http';
import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import { App } from '../../database/entities/app.entity';
import { EntityIvfflat } from '../../database/entities/entity-ivfflat.entity';
import { EntityHnsw } from '../../database/entities/entity-hnsw.entity';

export class VectorController {
    private embedder: FlagEmbedding | null = null;

    public initialize = async () => {
        this.embedder = await FlagEmbedding.init({
            model: EmbeddingModel.MLE5Large,
        });
    }

    private async getRepository<T>(target: EntityTarget<T>) {
        const dataSource = await getDataSource();
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }
        return dataSource.getRepository(target);
    }

    public getApp = async (req: Request, res: Response) => {
        const repository = await this.getRepository(App);
        const apps = await repository.find()
        return res.status(200).json(formatResponse(apps));
    }

    private async calculateLocalEmbedding(text: string): Promise<number[]> {
        let embeddingResult: number[] = [];
        if (!this.embedder) {
            throw new Error("El embedder no está inicializado. Llame a initialize() primero.");
        }
        const embeddings = this.embedder.embed([text]);
        for await (const batch of embeddings) {
            for (const embedding of batch) {
                embeddingResult = embedding;
            }
        }
        return embeddingResult;
    }

    private async callCohereService(text: string): Promise<number[]> {
        const embedding_type = "float";
        const cohereRequest: CohereRequest = {
            data: {
                model: "embed-multilingual-v3.0",
                input_type: "search_query",
                texts: [text],
                embedding_types: [embedding_type],
            },
        };
        const cohereResponse = await cohereService.embed(cohereRequest);
        return cohereResponse.embeddings[embedding_type][0];
    }

    public calculateEmbedding = async (req: Request, res: Response) => {
        const { text, type } = req.body;
        let embeddingResult: number[] = [];
        switch (String(type).toLowerCase()) {
            case "local":
                embeddingResult = await this.calculateLocalEmbedding(text);
                break;
            case "cohere":
                embeddingResult = await this.callCohereService(text);
                break;
            default:
                break;
        }
        return res.status(200).json(formatResponse(embeddingResult));
    }

    public queryEntity = async (req: Request, res: Response) => {
        const { text, indexType } = req.body;
        const indexAllow = ["ivfflat", "hnsw"].includes(indexType);
        if (!indexAllow) {
            return res.status(400).json(formatResponse("Index type not allowed"));
        }
        const index = String(indexType).toLowerCase();
        const embeddingResult = await this.calculateLocalEmbedding(text);

        let repository: Repository<any>;
        let alias: string = "";
        switch (index) {
            case "ivfflat":
                repository = await this.getRepository(EntityIvfflat);
                alias = "entity_ivfflat";
                break;
            case "hnsw":
                repository = await this.getRepository(EntityHnsw);
                alias = "entity_hnsw";
                break;
            default:
                return res.status(400).json(formatResponse("Index type not allowed"));
        }
        const data = await repository.createQueryBuilder(alias)
            .select([
                "id",
                "name",
                "embedding <=> :embedding as distance",
            ])
            .setParameter("embedding", pgvector.toSql(Array.from(embeddingResult)))
            // .where("embedding <=> :embedding < :umbral", { embedding: pgvector.toSql(embeddings), umbral: 0.6 })
            .orderBy("distance", "ASC")
            .limit(10)
            .getRawMany();

        return res.status(200).json(formatResponse(data));
    }

    public query = async (req: Request, res: Response) => {
        const { text } = req.body;
        const embeddingResult = await this.callCohereService(text);

        const repository = await this.getRepository(App);
        const apps = await repository.createQueryBuilder('apps')
            .select([
                "id",
                "name",
                "metadata",
                "embedding <=> :embedding as distance",
            ])
            .where("embedding <=> :embedding < :umbral", { embedding: pgvector.toSql(embeddingResult), umbral: 0.6 })
            .orderBy("distance", "ASC")
            .limit(10)
            .getRawMany();
        return res.status(200).json(formatResponse(apps));
    }

    public createAppsFromJelouBrain = async (req: Request, res: Response) => {
        const brains = await jelouBrainService.getPocketBrains();
        const brainsFiltered = brains
            .data
            .map((brain) => brain.routes && brain.routes.length > 0 ? brain : null)
            .filter((brain) => brain !== null)
            .map(brain => ({
                app_id: brain.app_id,
                brain_id: brain.id,
                capabilities: brain.settings.capabilities,
                description: brain.description,
                name: brain.name,
                type: brain.settings.isDraft ? "draft" : "public",
                skills: brain.routes.map(route => ({
                    id: route.reference_id,
                    intents: route.utterances.map(utterance => utterance.text)
                }))
            }));
        console.log(JSON.stringify(brainsFiltered, null, 2));
        const apps: App[] = [];
        const excludeFields = ["app_id", "brain_id", "type", "skills.*.id"];
        for (const brain of brainsFiltered) {
            const processedJson = embeddingService.prepareJsonForEmbedding(brain, excludeFields);
            const textToEmbed = embeddingService.jsonToText(processedJson);
            const embeddingResult = await this.callCohereService(textToEmbed);
            const app = new App();
            app.name = brain.name;
            app.metadata = brain;
            app.embedding = pgvector.toSql(embeddingResult);
            apps.push(app);
        }
        const repository = await this.getRepository(App);
        await repository.save(apps);
        return res.status(200).json(formatResponse(null));
    }
}

const controller = new VectorController();

controller.initialize().then(() => {
    console.log("VectorController initialized");
}).catch((error) => {
    console.error("Error initializing VectorController", error);
});

export default controller;
