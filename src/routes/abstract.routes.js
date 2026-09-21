import { Router } from 'express';
import { abstractController } from '../controllers/abstract.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// All abstract submission routes require authenticated user
router.use(authenticateToken);

router.post(
  '/',
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]),
  abstractController.submitAbstract
);
router.get('/my', abstractController.getMyAbstracts);
router.get('/:id', abstractController.getAbstractById);
router.delete('/:id', abstractController.deleteAbstract);

export default router;
