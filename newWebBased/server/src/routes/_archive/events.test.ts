
import { getDisciplinesForCompetition } from '../events';

// Mock Prisma client
const mockPrisma = {
  tfx_disziplinen: {
    findMany: async ({ select }: any) => [
      { var_name: 'Boden' },
      { var_name: 'Sprung' },
      { var_name: 'Stufenbarren' },
      { var_name: 'Schwebebalken' },
      { var_name: 'Reck' },
      { var_name: 'Pauschenpferd' },
      { var_name: 'Ringe' },
      { var_name: 'Barren' }
    ]
  }
};

describe('getDisciplinesForCompetition', () => {
  it('should return correct disciplines for vierkampf w', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf w (1-6Jahre)', mockPrisma as any);
    expect(result).toEqual(expect.arrayContaining(['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken']));
  });

  it('should return correct disciplines for sechskampf m', async () => {
    const result = await getDisciplinesForCompetition('Gerätsechskampf m (11-12Jahre)', mockPrisma as any);
    expect(result).toEqual(expect.arrayContaining(['Boden', 'Pauschenpferd', 'Ringe', 'Sprung', 'Barren', 'Reck']));
  });

  it('should return correct disciplines for geräte', async () => {
    const result = await getDisciplinesForCompetition('Gerätebahn (w 7-8 Jahre)', mockPrisma as any);
    expect(result).toEqual(expect.arrayContaining(['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken', 'Reck', 'Pauschenpferd', 'Ringe', 'Barren']));
  });

  it('should return basic disciplines for other competitions', async () => {
    const result = await getDisciplinesForCompetition('Other Competition', mockPrisma as any);
    expect(result).toEqual(expect.arrayContaining(['Boden', 'Sprung']));
  });
});
