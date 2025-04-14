import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "entity_hnsw" })
export class EntityHnsw {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "vector" as any })
    embedding: number[];
}