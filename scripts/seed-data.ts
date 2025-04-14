import { EmbeddingModel, FlagEmbedding } from "fastembed";
import { faker } from '@faker-js/faker';
import { getDataSource } from '../src/database/app.datasource';
import { EntityHnsw } from "../src/database/entities/entity-hnsw.entity";
import { EntityIvfflat } from "../src/database/entities/entity-ivfflat.entity";
import pgvector from 'pgvector';

interface RecordData {
    name: string;
    content: string;
    embedding?: number[];
}

class DataGenerator {
    private usedNames = new Set<string>();
    private embedder: FlagEmbedding | null = null;

    async initialize() {
        this.embedder = await FlagEmbedding.init({
            model: EmbeddingModel.MLE5Large,
        });
    }
    async generateUniqueRecords(count: number): Promise<RecordData[]> {
        if (!this.embedder) {
            throw new Error("El embedder no está inicializado. Llame a initialize() primero.");
        }
        console.log(`Generando ${count} registros únicos...`);
        const records: RecordData[] = [];
        const batchSize = 50;

        for (let i = 0; i < count; i += batchSize) {
            const currentBatchSize = Math.min(batchSize, count - i);
            console.log(`Procesando lote ${i / batchSize + 1}/${Math.ceil(count / batchSize)}, con ${currentBatchSize} registros...`);

            const batchRecords: RecordData[] = [];
            for (let j = 0; j < currentBatchSize; j++) {
                const record = this.generateUniqueRecord();
                batchRecords.push(record);
            }

            const contents = batchRecords.map(r => r.content);
            const embeddings = this.embedder.embed(contents);

            for await (const batch of embeddings) {
                for (let j = 0; j < batchRecords.length; j++) {
                    batchRecords[j].embedding = batch[j];
                }
            }
            for (const record of batchRecords) {
                if (!record.embedding || record.embedding.length === 0) {
                    console.warn(`Advertencia: Registro sin embedding: ${record.name}`);
                }
            }
            records.push(...batchRecords);
            console.log(`Completado lote ${i / batchSize + 1}, total procesado: ${records.length}`);
        }

        return records;
    }

    private generateUniqueRecord(): RecordData {
        // Primero seleccionamos qué tipo de contenido queremos generar
        const contentTypes = [
            'person',
            'company',
            'product',
            'location',
            'technology',
            'vehicle',
            'finance',
            'music',
            'book',
            'movie'
        ];

        // Elegimos aleatoriamente un tipo de contenido
        const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

        let name: string = "";
        let content: string = "";

        // Generamos nombre y contenido según el tipo elegido
        switch (contentType) {
            case 'person':
                const gender = Math.random() > 0.5 ? 'female' : 'male';
                const personName = faker.person.fullName({ sex: gender });
                name = `${personName} (${faker.person.jobTitle()})`;
                content = this.generatePersonContent(personName, gender);
                break;

            case 'company':
                const companyName = faker.company.name();
                name = `${companyName} - ${faker.company.catchPhrase()}`;
                content = this.generateCompanyContent(companyName);
                break;

            case 'product':
                const productName = faker.commerce.productName();
                name = `${productName} - ${faker.commerce.department()}`;
                content = this.generateProductContent(productName);
                break;

            case 'location':
                const city = faker.location.city();
                const country = faker.location.country();
                name = `${city}, ${country}`;
                content = this.generateLocationContent(city, country);
                break;

            case 'technology':
                const techName = `${faker.hacker.adjective()} ${faker.hacker.noun()}`;
                name = `${techName} ${faker.hacker.verb()}`;
                content = this.generateTechnologyContent(techName);
                break;

            case 'vehicle':
                const manufacturer = faker.vehicle.manufacturer();
                const model = faker.vehicle.model();
                name = `${manufacturer} ${model}`;
                content = this.generateVehicleContent(manufacturer, model);
                break;

            case 'finance':
                const bankName = `${faker.company.name()} Bank`;
                name = `${bankName} - ${faker.finance.accountName()}`;
                content = this.generateFinanceContent(bankName);
                break;

            case 'music':
                const artist = faker.person.fullName();
                const song = faker.music.songName();
                name = `${song} by ${artist}`;
                content = this.generateMusicContent(artist, song);
                break;

            case 'book':
                const bookTitle = `${faker.word.adjective()} ${faker.word.noun()} ${faker.helpers.arrayElements(['Chronicles', 'Story', 'Tales', 'Saga', 'Mystery', 'Adventure'], 1)[0]}`;
                name = bookTitle;
                content = this.generateBookContent(bookTitle);
                break;

            case 'movie':
                const movieTitle = `${faker.word.adjective()} ${faker.word.noun()}`;
                name = movieTitle;
                content = this.generateMovieContent(movieTitle);
                break;
        }

        // Verificar que el nombre sea único
        if (this.usedNames.has(name)) {
            // Si ya existe, generamos uno nuevo (recursivamente hasta encontrar uno único)
            return this.generateUniqueRecord();
        }

        this.usedNames.add(name);
        return { name, content };
    }

    private pickOne<T>(arr: T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    private generatePersonContent(name: string, gender: string): string {
        return `
        Name: ${name}
        Gender: ${gender}
        Job: ${faker.person.jobTitle()} at ${faker.company.name()}
        Email: ${faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] })}
        Phone: ${faker.phone.number()}
        Address: ${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()}, ${faker.location.zipCode()}, ${faker.location.country()}
        Bio: ${faker.person.bio()}
        Avatar URL: ${faker.image.avatar()}
        Username: ${faker.internet.username({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] })}
        Birthday: ${faker.date.birthdate().toISOString().split('T')[0]}"
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateCompanyContent(companyName: string): string {
        return `
        Company: ${companyName}
        Catch Phrase: ${faker.company.catchPhrase()}
        Business Slogan: ${faker.company.buzzPhrase()}
        Industry: ${faker.company.buzzNoun()}
        Website: ${faker.internet.url()}
        Address: ${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()}, ${faker.location.country()}
        Business Model: ${faker.company.buzzAdjective()} ${faker.company.buzzVerb()} ${faker.company.buzzNoun()}
        Founded: ${faker.date.past({ years: 30 }).getFullYear()}
        Number of Employees: ${faker.number.int({ min: 5, max: 10000 })}
        CEO: ${faker.person.fullName()}
        Annual Revenue: ${faker.finance.amount({ min: 100000, max: 10000000, dec: 0 })} ${faker.finance.currencyCode()}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateProductContent(productName: string): string {
        return `
        Product: ${productName}
        Department: ${faker.commerce.department()}
        Price: ${faker.commerce.price()} ${faker.finance.currencyCode()}
        Description: ${faker.commerce.productDescription()}
        Material: ${faker.commerce.productMaterial()}
        Adjective: ${faker.commerce.productAdjective()}
        Color: ${faker.color.human()}
        EAN: ${faker.commerce.isbn()}
        Stock: ${faker.number.int({ min: 0, max: 1000 })}
        Manufacturer: ${faker.company.name()}
        Features: ${faker.commerce.productAdjective()}, ${faker.commerce.productAdjective()}, ${faker.commerce.productAdjective()}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateLocationContent(city: string, country: string): string {
        const lat = faker.location.latitude();
        const lng = faker.location.longitude();
        return `
        Location: ${city}, ${faker.location.state()}, ${country}
        Coordinates: ${lat}, ${lng}
        Street: ${faker.location.street()}
        Address: ${faker.location.streetAddress({ useFullAddress: true })}
        County: ${faker.location.county()}
        Timezone: ${faker.location.timeZone()}
        Zip Code: ${faker.location.zipCode()}
        Direction: ${faker.location.cardinalDirection()}
        Nearest Airport: ${faker.airline.airport().name}
        Local Landmark: ${faker.word.noun()} ${faker.word.adjective()} ${faker.word.noun()}
        Population: ${faker.number.int({ min: 1000, max: 10000000 })}
        Climate: ${faker.science.chemicalElement().name} ${faker.word.adjective()}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateTechnologyContent(techName: string): string {
        return `
        Technology: ${techName}
        Programming Language: ${faker.hacker.noun()}
        Framework: ${faker.hacker.adjective()} ${faker.hacker.noun()} Framework
        Database: ${faker.hacker.abbreviation()}DB
        Server: ${faker.hacker.adjective()} Server
        Cloud Provider: ${faker.company.name()} Cloud
        Hacker Phrase: ${faker.hacker.phrase()}
        Technical Issue: ${faker.hacker.ingverb()} the ${faker.hacker.noun()} won't ${faker.hacker.verb()} the ${faker.hacker.adjective()} ${faker.hacker.noun()}
        IP Address: ${faker.internet.ip()}
        MAC Address: ${faker.internet.mac()}
        User Agent: ${faker.internet.userAgent()}
        Password: ${faker.internet.password()}
        Domain Name: ${faker.internet.domainName()}
        Protocol: ${faker.internet.protocol()}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateVehicleContent(manufacturer: string, model: string): string {
        return `
        Vehicle: ${manufacturer} ${model}
        Type: ${faker.vehicle.type()}
        Fuel: ${faker.vehicle.fuel()}
        VIN: ${faker.vehicle.vin()}
        Color: ${faker.vehicle.color()}
        Year: ${faker.date.past({ years: 20 }).getFullYear()}
        Price: ${faker.commerce.price({ min: 5000, max: 100000 })} ${faker.finance.currencyCode()}
        Mileage: ${faker.number.int({ min: 0, max: 200000 })} km
        Transmission: ${this.pickOne(['Manual', 'Automatic', 'Semi-automatic', 'CVT'])}
        Drivetrain: ${this.pickOne(['FWD', 'RWD', '4WD', 'AWD'])}
        License Plate: ${faker.vehicle.vrm()}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateFinanceContent(bankName: string): string {
        return `
        Bank: ${bankName}
        Account Number: ${faker.finance.accountNumber()}
        Account Name: ${faker.finance.accountName()}
        Amount: ${faker.finance.amount()} ${faker.finance.currencyCode()}
        Transaction Type: ${faker.finance.transactionType()}
        Credit Card: ${faker.finance.creditCardNumber()} (${faker.finance.creditCardIssuer()})
        Bitcoin Address: ${faker.finance.bitcoinAddress()}
        Ethereum Address: ${faker.finance.ethereumAddress()}
        Investment: ${faker.finance.amount({ min: 1000, max: 100000 })} in ${faker.company.name()}
        Insurance: ${faker.commerce.productName()} Insurance (${faker.finance.amount({ min: 100, max: 1000 })} annual premium)
        Transaction Date: ${faker.date.recent().toISOString()}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateMusicContent(artist: string, song: string): string {
        return `
        Artist: ${artist}
        Song: ${song}
        Genre: ${faker.music.genre()}
        Album: ${faker.word.adjective()} ${faker.word.noun()}
        Record Label: ${faker.company.name()} Records
        Released: ${faker.date.past({ years: 50 }).getFullYear()}
        Duration: ${faker.number.int({ min: 2, max: 5 })}:${faker.number.int({ min: 10, max: 59 }).toString().padStart(2, '0')}
        Producer: ${faker.person.fullName()}
        Musicians: ${faker.person.firstName()} (vocals), ${faker.person.firstName()} (guitar), ${faker.person.firstName()} (drums), ${faker.person.firstName()} (bass)
        Lyrics Excerpt: "${faker.lorem.paragraph()}"
        Chart Position: #${faker.number.int({ min: 1, max: 100 })}
        Music Video: ${faker.internet.url()}/watch?v=${faker.string.alphanumeric(11)}
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateBookContent(bookTitle: string): string {
        return `
        Book Title: ${bookTitle}
        Author: ${faker.person.fullName()}
        Genre: ${this.pickOne(['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Horror', 'Thriller', 'Historical Fiction', 'Biography'])}
        Publisher: ${faker.company.name()} Publishing
        Published: ${faker.date.past({ years: 100 }).getFullYear()}
        ISBN: ${faker.commerce.isbn()}
        Pages: ${faker.number.int({ min: 100, max: 900 })}
        Synopsis: ${faker.lorem.paragraph(3)}
        Main Character: ${faker.person.fullName()}, a ${faker.person.jobTitle()}
        Setting: ${faker.location.city()}, ${faker.location.country()}, ${this.pickOne(['Present Day', 'Medieval Times', 'Future', 'Victorian Era', 'Ancient Times'])}
        Awards: ${this.pickOne(['Pulitzer Prize', 'Booker Prize', 'Nobel Prize in Literature', 'Hugo Award', 'None'])}
        Rating: ${faker.number.float({ min: 1, max: 5 })}/5
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    private generateMovieContent(movieTitle: string): string {
        return `
        Movie Title: ${movieTitle}
        Director: ${faker.person.fullName()}
        Genre: ${this.pickOne(['Action', 'Comedy', 'Drama', 'Horror', 'Science Fiction', 'Romance', 'Documentary', 'Thriller'])}
        Release Year: ${faker.date.past({ years: 50 }).getFullYear()}
        Runtime: ${faker.number.int({ min: 80, max: 180 })} minutes
        Studio: ${faker.company.name()} Studios
        Main Cast: ${faker.person.fullName()}, ${faker.person.fullName()}, ${faker.person.fullName()}
        Plot Summary: ${faker.lorem.paragraph(3)}
        Budget: $${faker.number.int({ min: 1, max: 250 })} million
        Box Office: $${faker.number.int({ min: 1, max: 2000 })} million
        Film Location: ${faker.location.city()}, ${faker.location.country()}
        MPAA Rating: ${this.pickOne(['G', 'PG', 'PG-13', 'R', 'NC-17'])}
        Tagline: "${faker.lorem.sentence(4)}"
        
        ${faker.lorem.paragraphs(2)}
            `.trim();
    }

    async saveToDatabase(records: RecordData[]) {
        const dataSource = await getDataSource();

        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }

        const hnswRepository = dataSource.getRepository(EntityHnsw);
        const ivfflatRepository = dataSource.getRepository(EntityIvfflat);

        await hnswRepository.clear();
        await ivfflatRepository.clear();

        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const hnswEntities = batch.map(record => {
                const entity = new EntityHnsw();
                entity.name = record.name;
                entity.embedding = pgvector.toSql(Array.from(record.embedding!));
                return entity;
            });

            const ivfflatEntities = batch.map(record => {
                const entity = new EntityIvfflat();
                entity.name = record.name;
                entity.embedding = pgvector.toSql(Array.from(record.embedding!));
                return entity;
            });

            await Promise.all([
                hnswRepository.save(hnswEntities),
                ivfflatRepository.save(ivfflatEntities)
            ]);
        }
    }
}

async function main() {
    try {
        const generator = new DataGenerator();
        await generator.initialize();

        const records = await generator.generateUniqueRecords(5000);
        await generator.saveToDatabase(records);
        console.log("¡Proceso completado correctamente!");
        process.exit(0);
    } catch (error) {
        console.error("Error durante la generación de datos:", error);
        process.exit(1);
    }
}

main();