/**
 * Mock Prisma client for tests to avoid database dependency in CI
 */

export const createMockPrisma = () => {
  return {
    // Mock database tables
    tfx_disziplinen: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tfx_veranstaltungen: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tfx_teilnehmer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tfx_vereine: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tfx_wettkaempfe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
  };
};

// Legacy mock properties for backward compatibility
const mockPrisma = createMockPrisma();

// Add legacy model names that might be used in old tests
(mockPrisma as any).discipline = mockPrisma.tfx_disziplinen;
(mockPrisma as any).competition = mockPrisma.tfx_wettkaempfe;
(mockPrisma as any).participant = mockPrisma.tfx_teilnehmer;
(mockPrisma as any).club = mockPrisma.tfx_vereine;
(mockPrisma as any).user = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export default mockPrisma;
