import { Router } from 'express';
import timePlanningCoreRouter from './timePlanningCore';
import timePlanningOverviewRouter from './timePlanningOverview';
import timePlanningMatrixRouter from './timePlanningMatrix';
import timePlanningWizardRouter from './timePlanningWizard';
import timePlanningActiveSquadsRouter from './timePlanningActiveSquads';
import timePlanningDurchgaengeRouter from './timePlanningDurchgaenge';
import timePlanningBahnenRouter from './timePlanningBahnen';

const router = Router();

router.use(timePlanningCoreRouter);
router.use(timePlanningOverviewRouter);
router.use(timePlanningMatrixRouter);
router.use(timePlanningWizardRouter);
router.use(timePlanningActiveSquadsRouter);
router.use(timePlanningDurchgaengeRouter);
router.use(timePlanningBahnenRouter);

export default router;
