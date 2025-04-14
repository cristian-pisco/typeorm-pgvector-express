import { Router } from 'express';
import VectorRouter from './vector.router';

const router = Router();

// Define routes
router.use('/vector', VectorRouter);

export default router;