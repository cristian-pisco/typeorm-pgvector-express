import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "apps" })
export class App {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "jsonb" })
    metadata: Record<string, unknown>;

    @Column({ type: "vector" as any })
    embedding: number[];
}
