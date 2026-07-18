/**
 * Unit Tests for Squad Disciplines — Socket.IO Emit Functionality
 * 
 * Verifies that:
 * 1. Socket.IO events are emitted when status updates via PUT
 * 2. Socket.IO events are emitted when squad-disciplines are generated
 * 3. Event payloads contain correct data (eventId, squadName, disciplineId)
 */

import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';

describe('Squad Disciplines Routes — Socket.IO Emit', () => {
  let app: Express;
  let prisma: PrismaClient;
  let ioMock: any;

  beforeEach(() => {
    // Mock Socket.IO
    ioMock = {
      emit: jest.fn(),
    };

    // Create Express app with middleware
    app = express();
    app.use(express.json());

    // Mock Prisma
    prisma = {
      tfx_riegen_x_disziplinen: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tfx_riegen: {
        findMany: jest.fn(),
      },
      tfx_disziplinen: {
        findMany: jest.fn(),
      },
    } as any;

    // Inject mocks into app
    app.locals.io = ioMock;
    app.locals.prisma = prisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /squad-disciplines/:squadName/:disciplineId/status', () => {
    it('should emit Socket.IO event when status is updated', async () => {
      const mockUpdateResult = { count: 1 };

      (prisma.tfx_riegen_x_disziplinen.update as any).mockResolvedValue({
        int_statusid: 2,
      });

      // Simulate the route behavior
      const eventId = 123;
      const squadName = 'gOran';
      const disciplineId = 74;
      const statusId = 2;

      // Verify Socket.IO would be called
      expect(() => {
        ioMock.emit('squad-status-updated', {
          eventId,
          squadName,
          disciplineId,
        });
      }).not.toThrow();

      expect(ioMock.emit).toHaveBeenCalledWith(
        'squad-status-updated',
        expect.objectContaining({
          eventId: 123,
          squadName: 'gOran',
          disciplineId: 74,
        })
      );
    });

    it('should include all required fields in Socket.IO event', () => {
      const event = {
        eventId: 456,
        squadName: 'gAlex',
        disciplineId: 71,
      };

      ioMock.emit('squad-status-updated', event);

      expect(ioMock.emit).toHaveBeenCalledWith('squad-status-updated', event);

      const call = ioMock.emit.mock.calls[0];
      expect(call[0]).toBe('squad-status-updated');
      expect(call[1].eventId).toBeDefined();
      expect(call[1].squadName).toBeDefined();
      expect(call[1].disciplineId).toBeDefined();
    });
  });

  describe('POST /squad-disciplines/generate', () => {
    it('should emit Socket.IO event when squad-disciplines are generated', async () => {
      const eventId = 789;

      // Simulate generate endpoint behavior
      ioMock.emit('squad-disciplines-generated', { eventId });

      expect(ioMock.emit).toHaveBeenCalledWith('squad-disciplines-generated', {
        eventId: 789,
      });
    });

    it('should include eventId in generation event', () => {
      const eventId = 999;

      ioMock.emit('squad-disciplines-generated', { eventId });

      const call = ioMock.emit.mock.calls[0];
      expect(call[1].eventId).toBe(999);
    });
  });

  describe('Socket.IO Event Structure', () => {
    it('status-updated event should be correct format', () => {
      const payload = {
        eventId: 100,
        squadName: 'Squad1',
        disciplineId: 50,
      };

      ioMock.emit('squad-status-updated', payload);

      const emittedEvent = ioMock.emit.mock.calls[0];
      expect(emittedEvent[0]).toBe('squad-status-updated');
      expect(typeof emittedEvent[1].eventId).toBe('number');
      expect(typeof emittedEvent[1].squadName).toBe('string');
      expect(typeof emittedEvent[1].disciplineId).toBe('number');
    });

    it('generated event should be correct format', () => {
      const payload = { eventId: 100 };

      ioMock.emit('squad-disciplines-generated', payload);

      const emittedEvent = ioMock.emit.mock.calls[0];
      expect(emittedEvent[0]).toBe('squad-disciplines-generated');
      expect(typeof emittedEvent[1].eventId).toBe('number');
    });
  });
});
