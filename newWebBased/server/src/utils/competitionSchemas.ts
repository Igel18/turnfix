import { z } from 'zod';
import { MIN_COMPETITION_AGE, MAX_COMPETITION_AGE } from '@turnfix/shared';

export const competitionAgeSchema = z.number().int().min(MIN_COMPETITION_AGE).max(MAX_COMPETITION_AGE);
