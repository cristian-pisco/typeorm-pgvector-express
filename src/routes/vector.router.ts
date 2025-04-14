import { Router } from 'express';
import VectorController from '../controllers/vector';
import { asyncHandler } from '../utils/express.utils';

const router = Router();

// Define routes
router.get('/', asyncHandler(VectorController.getApp));
router.post('/query', asyncHandler(VectorController.query));
router.post('/entity/query', asyncHandler(VectorController.queryEntity));
router.post('/jelou-brain', asyncHandler(VectorController.createAppsFromJelouBrain));
router.post('/embedding', asyncHandler(VectorController.calculateEmbedding));

export default router;