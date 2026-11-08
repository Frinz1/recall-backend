import { Router } from 'express';
import { SubjectController } from './subject.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', SubjectController.listSubjects);
router.get('/:id', SubjectController.getSubject);
router.post('/', SubjectController.createSubject);
router.patch('/:id', SubjectController.updateSubject);
router.delete('/:id', SubjectController.deleteSubject);

export default router;
