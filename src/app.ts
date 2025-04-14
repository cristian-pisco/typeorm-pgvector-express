import express from 'express';
import { json, urlencoded } from 'body-parser';
import routes from './routes/router';
import { errorHandler } from './middlewares';
import config from './config';

const app = express();

// Middleware setup
app.set('port', config.port)
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes setup
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

export default app;
