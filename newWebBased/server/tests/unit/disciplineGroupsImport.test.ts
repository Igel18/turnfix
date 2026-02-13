/**
 * Unit tests for the discipline groups import utility.
 * 
 * Tests the importDisciplineGroups function which creates standard
 * discipline groups (4-Kampf, 6-Kampf) for P-Wettkampf and LK programs.
 */

// Create mock before jest.mock hoisting
const mockPrismaClient = {
  tfx_disziplinen_gruppen: {
    count: jest.fn(),
    create: jest.fn(),
  },
  tfx_disziplinen: {
    findMany: jest.fn(),
  },
  tfx_disgrp_x_disziplinen: {
    create: jest.fn(),
  },
};

// Mock the default prisma client module
jest.mock('../../src/db/connection', () => ({
  __esModule: true,
  default: mockPrismaClient,
}));

// Mock debug utility
jest.mock('../../src/utils/debug', () => ({
  isDebug: () => false,
}));

// Import AFTER mocks are set up
import { importDisciplineGroups, DisciplineGroupsStats } from '../../src/utils/disciplineGroupsImport';

/**
 * Helper: All disciplines that the standard groups reference.
 * These simulate what a full production disciplines import would produce.
 */
const ALL_REFERENCED_DISCIPLINES = [
  // P-Wettkampf disciplines
  { int_disziplinenid: 1, var_name: 'Reck/StuBa. P1-P9' },
  { int_disziplinenid: 2, var_name: 'Schwebebalken P1-P9' },
  { int_disziplinenid: 3, var_name: 'Sprung w. P1-P9' },
  { int_disziplinenid: 4, var_name: 'Boden' },
  { int_disziplinenid: 5, var_name: 'Reck m. P1-P9' },
  { int_disziplinenid: 6, var_name: 'Sprung m. P1-P9' },
  { int_disziplinenid: 7, var_name: 'Par.-Barren P1-P9' },
  { int_disziplinenid: 8, var_name: 'Ringe P1-P9' },
  { int_disziplinenid: 9, var_name: 'Pauschenpferd P1-P9' },
  // LK1 disciplines
  { int_disziplinenid: 10, var_name: 'Boden m. LK1' },
  { int_disziplinenid: 11, var_name: 'Reck m. LK1' },
  { int_disziplinenid: 12, var_name: 'Sprung m. LK1' },
  { int_disziplinenid: 13, var_name: 'Par.-Barren LK1' },
  { int_disziplinenid: 14, var_name: 'Ringe LK1' },
  { int_disziplinenid: 15, var_name: 'P.-Pferd LK1' },
  // LK2 disciplines
  { int_disziplinenid: 16, var_name: 'Boden m. LK2' },
  { int_disziplinenid: 17, var_name: 'Reck m. LK2' },
  { int_disziplinenid: 18, var_name: 'Sprung m. LK2' },
  { int_disziplinenid: 19, var_name: 'Par.-Barren LK2' },
  { int_disziplinenid: 20, var_name: 'Ringe LK2' },
  { int_disziplinenid: 21, var_name: 'P.-Pferd LK2' },
  // LK3 disciplines
  { int_disziplinenid: 22, var_name: 'Boden m. LK3' },
  { int_disziplinenid: 23, var_name: 'Reck m. LK3' },
  { int_disziplinenid: 24, var_name: 'Sprung m. LK3' },
  { int_disziplinenid: 25, var_name: 'Par.-Barren LK3' },
  { int_disziplinenid: 26, var_name: 'Ringe LK3' },
  { int_disziplinenid: 27, var_name: 'P.-Pferd LK3' },
];

describe('importDisciplineGroups', () => {
  // Auto-increment group IDs returned by create
  let groupIdCounter: number;

  beforeEach(() => {
    jest.clearAllMocks();
    groupIdCounter = 1;

    // Default: create returns incrementing IDs
    mockPrismaClient.tfx_disziplinen_gruppen.create.mockImplementation(async () => {
      const id = groupIdCounter++;
      return { int_disziplinen_gruppenid: id };
    });

    mockPrismaClient.tfx_disgrp_x_disziplinen.create.mockResolvedValue({});
  });

  describe('when database is fresh (no existing groups)', () => {
    beforeEach(() => {
      mockPrismaClient.tfx_disziplinen_gruppen.count.mockResolvedValue(0);
      mockPrismaClient.tfx_disziplinen.findMany.mockResolvedValue(ALL_REFERENCED_DISCIPLINES);
    });

    it('should return success', async () => {
      const result = await importDisciplineGroups();
      expect(result.success).toBe(true);
    });

    it('should create exactly 9 groups', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.createdGroups).toBe(9);
      expect(mockPrismaClient.tfx_disziplinen_gruppen.create).toHaveBeenCalledTimes(9);
    });

    it('should have no skipped groups', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.skippedGroups).toBe(0);
    });

    it('should report totalGroups as 9', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.totalGroups).toBe(9);
    });

    it('should create correct group names in order', async () => {
      await importDisciplineGroups();
      const groupNames = mockPrismaClient.tfx_disziplinen_gruppen.create.mock.calls
        .map((c: any) => c[0].data.var_name);

      expect(groupNames).toEqual([
        '4-Kampf w P',
        '4-Kampf m P',
        '6-Kampf m P',
        '4-Kampf m LK1',
        '6-Kampf m LK1',
        '4-Kampf m LK2',
        '6-Kampf m LK2',
        '4-Kampf m LK3',
        '6-Kampf m LK3',
      ]);
    });

    it('should set comments on all groups', async () => {
      await importDisciplineGroups();
      const calls = mockPrismaClient.tfx_disziplinen_gruppen.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.txt_comment).toBeTruthy();
      });
    });

    it('should create 4 discipline assignments for 4-Kampf w P', async () => {
      await importDisciplineGroups();
      // Group 1 (ID=1) = 4-Kampf w P (4 disciplines)
      const assignmentsForGroup1 = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 1);
      expect(assignmentsForGroup1.length).toBe(4);
    });

    it('should create 4 discipline assignments for 4-Kampf m P', async () => {
      await importDisciplineGroups();
      const assignments = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 2);
      expect(assignments.length).toBe(4);
    });

    it('should create 6 discipline assignments for 6-Kampf m P', async () => {
      await importDisciplineGroups();
      const assignments = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 3);
      expect(assignments.length).toBe(6);
    });

    it('should create 4 discipline assignments for LK 4-Kampf groups', async () => {
      await importDisciplineGroups();
      // LK1 4-Kampf = group 4 (ID=4), LK2 4-Kampf = group 6 (ID=6), LK3 4-Kampf = group 8 (ID=8)
      for (const groupId of [4, 6, 8]) {
        const assignments = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
          .filter((c: any) => c[0].data.int_disziplinen_gruppenid === groupId);
        expect(assignments.length).toBe(4);
      }
    });

    it('should create 6 discipline assignments for LK 6-Kampf groups', async () => {
      await importDisciplineGroups();
      // LK1 6-Kampf = group 5 (ID=5), LK2 6-Kampf = group 7 (ID=7), LK3 6-Kampf = group 9 (ID=9)
      for (const groupId of [5, 7, 9]) {
        const assignments = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
          .filter((c: any) => c[0].data.int_disziplinen_gruppenid === groupId);
        expect(assignments.length).toBe(6);
      }
    });

    it('should assign correct total number of discipline assignments', async () => {
      const result = await importDisciplineGroups();
      // P groups: 4+4+6 = 14, LK groups: (4+6)*3 = 30, Total = 44
      // 9 groups total: 3 P-groups + 6 LK-groups
      expect(result.stats.createdAssignments).toBe(44);
    });

    it('should assign position ordering starting from 1', async () => {
      await importDisciplineGroups();
      // Check positions for group 1 (4-Kampf w P, 4 disciplines → positions 1,2,3,4)
      const group1Assignments = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 1);
      const positions = group1Assignments.map((c: any) => c[0].data.int_pos);
      expect(positions).toEqual([1, 2, 3, 4]);
    });

    it('should have no missing disciplines when all exist', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.missingDisciplines.length).toBe(0);
    });

    it('should reference correct discipline IDs for 4-Kampf w P', async () => {
      await importDisciplineGroups();
      const group1Assignments = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 1);
      const discIds = group1Assignments.map((c: any) => c[0].data.int_disziplinenid);
      // Reck/StuBa(1), Schwebebalken(2), Sprung w(3), Boden(4)
      expect(discIds).toEqual([1, 2, 3, 4]);
    });
  });

  describe('when groups already exist', () => {
    beforeEach(() => {
      mockPrismaClient.tfx_disziplinen_gruppen.count.mockResolvedValue(5);
      mockPrismaClient.tfx_disziplinen.findMany.mockResolvedValue(ALL_REFERENCED_DISCIPLINES);
    });

    it('should return success (skip is not an error)', async () => {
      const result = await importDisciplineGroups();
      expect(result.success).toBe(true);
    });

    it('should skip all groups', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.skippedGroups).toBe(9);
      expect(result.stats.createdGroups).toBe(0);
    });

    it('should not create any groups or assignments', async () => {
      await importDisciplineGroups();
      expect(mockPrismaClient.tfx_disziplinen_gruppen.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_disgrp_x_disziplinen.create).not.toHaveBeenCalled();
    });

    it('should not even load disciplines', async () => {
      await importDisciplineGroups();
      expect(mockPrismaClient.tfx_disziplinen.findMany).not.toHaveBeenCalled();
    });
  });

  describe('when no disciplines exist in database', () => {
    beforeEach(() => {
      mockPrismaClient.tfx_disziplinen_gruppen.count.mockResolvedValue(0);
      mockPrismaClient.tfx_disziplinen.findMany.mockResolvedValue([]);
    });

    it('should return failure', async () => {
      const result = await importDisciplineGroups();
      expect(result.success).toBe(false);
    });

    it('should not create any groups', async () => {
      await importDisciplineGroups();
      expect(mockPrismaClient.tfx_disziplinen_gruppen.create).not.toHaveBeenCalled();
    });

    it('should report zero stats', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.createdGroups).toBe(0);
      expect(result.stats.createdAssignments).toBe(0);
    });
  });

  describe('when some disciplines are missing', () => {
    beforeEach(() => {
      mockPrismaClient.tfx_disziplinen_gruppen.count.mockResolvedValue(0);
      // Only provide P disciplines, no LK disciplines
      mockPrismaClient.tfx_disziplinen.findMany.mockResolvedValue([
        { int_disziplinenid: 1, var_name: 'Reck/StuBa. P1-P9' },
        { int_disziplinenid: 2, var_name: 'Schwebebalken P1-P9' },
        { int_disziplinenid: 3, var_name: 'Sprung w. P1-P9' },
        { int_disziplinenid: 4, var_name: 'Boden' },
        { int_disziplinenid: 5, var_name: 'Reck m. P1-P9' },
        { int_disziplinenid: 6, var_name: 'Sprung m. P1-P9' },
        { int_disziplinenid: 7, var_name: 'Par.-Barren P1-P9' },
        { int_disziplinenid: 8, var_name: 'Ringe P1-P9' },
        { int_disziplinenid: 9, var_name: 'Pauschenpferd P1-P9' },
      ]);
    });

    it('should still return success', async () => {
      const result = await importDisciplineGroups();
      expect(result.success).toBe(true);
    });

    it('should still create all 9 groups', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.createdGroups).toBe(9);
    });

    it('should report missing disciplines', async () => {
      const result = await importDisciplineGroups();
      expect(result.stats.missingDisciplines.length).toBeGreaterThan(0);
    });

    it('should report LK disciplines as missing', async () => {
      const result = await importDisciplineGroups();
      const missingNames = result.stats.missingDisciplines;
      // LK1 disciplines should be missing
      expect(missingNames.some((m: string) => m.includes('Boden m. LK1'))).toBe(true);
      expect(missingNames.some((m: string) => m.includes('Reck m. LK1'))).toBe(true);
    });

    it('should include group name in missing discipline entries', async () => {
      const result = await importDisciplineGroups();
      // Format: "GroupName: DisciplineName"
      result.stats.missingDisciplines.forEach((entry: string) => {
        expect(entry).toContain(':');
      });
    });

    it('should create full assignments for P groups (all found)', async () => {
      await importDisciplineGroups();
      // 4-Kampf w P (group 1) = 4 disciplines, all P
      const group1 = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 1);
      expect(group1.length).toBe(4);
    });

    it('should create zero assignments for LK groups (all missing)', async () => {
      await importDisciplineGroups();
      // LK1 4-Kampf = group 4 (all 4 disciplines missing)
      const group4 = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls
        .filter((c: any) => c[0].data.int_disziplinen_gruppenid === 4);
      expect(group4.length).toBe(0);
    });
  });

  describe('custom Prisma client support', () => {
    it('should use custom client when provided', async () => {
      const customClient = {
        tfx_disziplinen_gruppen: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockImplementation(async () => ({ int_disziplinen_gruppenid: 99 })),
        },
        tfx_disziplinen: {
          findMany: jest.fn().mockResolvedValue(ALL_REFERENCED_DISCIPLINES),
        },
        tfx_disgrp_x_disziplinen: {
          create: jest.fn().mockResolvedValue({}),
        },
      } as any;

      await importDisciplineGroups(customClient);

      // Should use custom client, not mock default
      expect(customClient.tfx_disziplinen_gruppen.count).toHaveBeenCalled();
      expect(customClient.tfx_disziplinen.findMany).toHaveBeenCalled();
      expect(mockPrismaClient.tfx_disziplinen_gruppen.count).not.toHaveBeenCalled();
    });

    it('should use null client as default client', async () => {
      mockPrismaClient.tfx_disziplinen_gruppen.count.mockResolvedValue(0);
      mockPrismaClient.tfx_disziplinen.findMany.mockResolvedValue(ALL_REFERENCED_DISCIPLINES);

      await importDisciplineGroups(null);

      // null should fall back to default
      expect(mockPrismaClient.tfx_disziplinen_gruppen.count).toHaveBeenCalled();
    });
  });

  describe('data validation', () => {
    beforeEach(() => {
      mockPrismaClient.tfx_disziplinen_gruppen.count.mockResolvedValue(0);
      mockPrismaClient.tfx_disziplinen.findMany.mockResolvedValue(ALL_REFERENCED_DISCIPLINES);
    });

    it('group names should fit in VarChar(100)', async () => {
      await importDisciplineGroups();
      const calls = mockPrismaClient.tfx_disziplinen_gruppen.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.var_name.length).toBeLessThanOrEqual(100);
      });
    });

    it('group names should not be empty', async () => {
      await importDisciplineGroups();
      const calls = mockPrismaClient.tfx_disziplinen_gruppen.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.var_name.length).toBeGreaterThan(0);
      });
    });

    it('position values should be positive integers', async () => {
      await importDisciplineGroups();
      const calls = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.int_pos).toBeGreaterThan(0);
        expect(Number.isInteger(call[0].data.int_pos)).toBe(true);
      });
    });

    it('all assignments should reference valid group IDs', async () => {
      await importDisciplineGroups();
      const calls = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.int_disziplinen_gruppenid).toBeGreaterThan(0);
      });
    });

    it('all assignments should reference valid discipline IDs', async () => {
      await importDisciplineGroups();
      const calls = mockPrismaClient.tfx_disgrp_x_disziplinen.create.mock.calls;
      const validIds = ALL_REFERENCED_DISCIPLINES.map(d => d.int_disziplinenid);
      calls.forEach((call: any) => {
        expect(validIds).toContain(call[0].data.int_disziplinenid);
      });
    });
  });
});
