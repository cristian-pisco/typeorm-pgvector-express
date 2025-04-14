export class EmbeddingService {
    public prepareJsonForEmbedding(json: any, excludeFields: string[]) {
        const clonedData = JSON.parse(JSON.stringify(json));
        for (const field of excludeFields) {
            if (field.includes('*')) {
                const parts = field.split('.');
                const arrayField = parts[0];
                const wildcardIndex = parts.indexOf('*');
                const subField = parts[wildcardIndex + 1];

                if (Array.isArray(clonedData[arrayField])) {
                    for (const item of clonedData[arrayField]) {
                        if (typeof item === 'object' && item !== null) {
                            delete item[subField];
                        }
                    }
                }
            } else {
                delete clonedData[field];
            }
        }
        return clonedData;
    }

    public jsonToText(json: Record<string, unknown>): string {
        let result = '';

        for (const [key, value] of Object.entries(json)) {
            if (Array.isArray(value)) {
                if (value.every(item => typeof item === 'string')) {
                    // result += `${key}: ${value.join(', ')}\n`;
                    result += `${value.join(', ')}\n`;
                } else {
                    for (const item of value) {
                        if (typeof item === 'object' && item !== null) {
                            const nestedText = this.jsonToText(item);
                            // result += `${key}: ${nestedText}\n`;
                            result += `${nestedText}\n`;
                        }
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                const nestedText = this.jsonToText(value as Record<string, unknown>);
                // result += `${key}: ${nestedText}\n`;
                result += `${nestedText}\n`;
            } else {
                // result += `${key}: ${value}\n`;
                result += `${value}\n`;
            }
        }

        return result.trim();
    }
}

export default new EmbeddingService();
