import { dropTestDatabase } from './setup-test-db';

dropTestDatabase().catch((error) => {
  console.error('Failed to drop test database:', error);
  process.exitCode = 1;
});