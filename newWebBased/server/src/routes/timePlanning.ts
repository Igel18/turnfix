import { Router } from 'express';
import timePlanningCoreRouter from './timePlanningCore';
import timePlanningOverviewRouter from './timePlanningOverview';
import timePlanningMatrixRouter from './timePlanningMatrix';
import timePlanningWizardRouter from './timePlanningWizard';
import timePlanningActiveSquadsRouter from './timePlanningActiveSquads';

const router = Router();

router.use(timePlanningCoreRouter);
router.use(timePlanningOverviewRouter);
router.use(timePlanningMatrixRouter);
router.use(timePlanningWizardRouter);
router.use(timePlanningActiveSquadsRouter);

export default router;
