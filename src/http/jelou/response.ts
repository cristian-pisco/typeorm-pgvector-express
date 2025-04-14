export interface BrainResult {
    data: Brain[];
}

export interface Brain {
    id:                 string;
    name:               string;
    description:        string;
    settings:           Settings;
    ecommerce_settings: EcommerceSettings;
    status:             string;
    app_id:             string;
    deleted_at?:         Date;
    created_at:         Date;
    updated_at:         Date;
    knowledge_count:    number;
    skill_count:        number;
    types:              unknown[];
    channel_types:      unknown[];
    routes:             Route[];
}

export interface EcommerceSettings {
    app_id: string;
}

export interface Route {
    id:           string;
    name:         string;
    reference_id: string;
    status:       string;
    brain_id:     string;
    deleted_at:   null;
    created_at:   Date;
    updated_at:   Date;
    utterances:   Utterance[];
}

export interface Utterance {
    id:         number;
    text:       string;
    synced:     boolean;
    route_id:   string;
    created_at: Date;
    updated_at: Date;
}

export interface Settings {
    type:           string;
    isDraft:        boolean;
    capabilities:   string[];
    embedding_type: string;
}