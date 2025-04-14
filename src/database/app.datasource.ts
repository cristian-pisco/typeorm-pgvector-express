import { DataSource } from "typeorm";
import dotenv from 'dotenv';
import { createTunnel, ForwardOptions, ServerOptions, SshOptions, TunnelOptions } from 'tunnel-ssh';
import { readFileSync } from "fs";
import { Server } from "net";
import { WithLengthColumnType } from "typeorm/driver/types/ColumnTypes";
import { App } from "./entities/app.entity";
import { EntityHnsw } from "./entities/entity-hnsw.entity";
import { EntityIvfflat } from "./entities/entity-ivfflat.entity";

dotenv.config();

export let dataSource: DataSource | null = null;
let tunnelServer: any;
let localPort: number;
let localHost: string;
let isSsl: boolean = false;

const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE, NODE_ENV, SSH_USERNAME, SSH_HOST, SSH_PRIVATE_KEY, IS_SSH } = process.env;

export const connection = async () => {
    isSsl = IS_SSH === "true";
    console.log(isSsl);
    if (!isSsl) {
        localHost = DB_HOST;
        localPort = Number(DB_PORT);
        return;
    }
    const tunnelOptions: TunnelOptions = {
        autoClose: false,
        reconnectOnError: false,
    };
    const sshOptions: SshOptions = {
        username: SSH_USERNAME,
        host: SSH_HOST,
        privateKey: readFileSync(SSH_PRIVATE_KEY),
        port: 22,
    };
    const forwardOptions: ForwardOptions = {
        srcAddr: '127.0.0.1',
        srcPort: 0,
        dstAddr: DB_HOST,
        dstPort: Number(DB_PORT),
    };
    const serverOptions: ServerOptions = {
        host: '127.0.0.1',
    };
    [tunnelServer] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
    console.log(tunnelServer.address());
    localHost = tunnelServer.address().address;
    localPort = tunnelServer.address().port as number;
}

export const getDataSource = async () => {
    if (!dataSource) {
        await connection();
        dataSource = new DataSource({
            type: "postgres",
            host: localHost,
            port: localPort,
            username: DB_USERNAME,
            password: DB_PASSWORD,
            database: DB_DATABASE,
            synchronize: NODE_ENV === "production" ? false : true,
            logging: NODE_ENV === "development" ? true : false,
            entities: [
                App,
                EntityHnsw,
                EntityIvfflat,
            ],
            ssl: isSsl ?? {
                rejectUnauthorized: false,
                ca: readFileSync(SSH_PRIVATE_KEY)
            },
        });
        dataSource.driver.supportedDataTypes.push('vector' as WithLengthColumnType);
        dataSource.driver.withLengthColumnTypes.push('vector' as WithLengthColumnType);
    }
    return dataSource;
}

export const closeTunnel = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (tunnelServer) {
            tunnelServer.close((err) => {
                if (err) {
                    console.error('Error closing SSH tunnel:', err);
                    reject(err);
                } else {
                    console.log('SSH tunnel closed successfully');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};
