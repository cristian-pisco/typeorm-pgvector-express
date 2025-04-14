export interface SkillDto {
    id: string;
    intents: string[];
}

export interface AppDto {
    id: string;
    app_id: string;
    name: string;
    description: string;
    capabilities: string;
    skills: SkillDto[];
}