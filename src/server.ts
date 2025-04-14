import { closeTunnel, getDataSource } from "./database/app.datasource";
import app from "./app";

const startServer = async () => {
	try {
		const dataSource = await getDataSource();
		await dataSource.initialize();
		console.log("Data Source has been initialized!");

		const server = app.listen(app.get("port"), () => {
			console.log(
				"  App is running at http://localhost:%d in %s mode",
				app.get("port"),
				app.get("env"),
			);
			console.log("  Press CTRL-C to stop\n");
		});

		const gracefulShutdown = async () => {
			console.log('Shutting down gracefully...');
			server.close(async () => {
				console.log('HTTP server closed');

				// Cerrar la conexión de la base de datos
				if (dataSource.isInitialized) {
					await dataSource.destroy();
					console.log('Database connection closed');
				}

				// Cerrar el túnel SSH
				await closeTunnel();

				console.log('All connections closed. Exiting process.');
				process.exit(0);
			});
		};

		process.on('SIGINT', gracefulShutdown);
		process.on('SIGTERM', gracefulShutdown);

		return server;
	} catch (error) {
		console.error("Error during Data Source initialization:", error);
		process.exit(1);
	}
};

const server = startServer();

export default server;
