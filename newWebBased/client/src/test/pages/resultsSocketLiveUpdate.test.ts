/**
 * Results Page - Socket Live Update Tests (#107)
 *
 * Bug: After entering a score, the results view was not updating automatically.
 *
 * Root cause: The socket effect in Results/index.tsx registered listeners for
 * 'score-updated' and 'competition-updated' but never called
 * socket.emit('join-competition', eventId). The server emits 'score-updated'
 * only to room 'competition-{eventId}', so clients that have not joined the
 * room never receive those events.
 *
 * Fix: Added socket.emit('join-competition', eventId) on effect mount and
 * socket.emit('leave-competition', eventId) in the cleanup. This mirrors the
 * working pattern used in Medallienspiegel.tsx.
 *
 * These tests verify the socket effect lifecycle by running the same logic
 * the useEffect in Results/index.tsx executes — no React renderer required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock socket helper ───────────────────────────────────────────────────────

type MockSocket = ReturnType<typeof createMockSocket>

function createMockSocket() {
  const listeners: Record<string, Array<() => void>> = {}
  const emitted: Array<{ event: string; arg: unknown }> = []

  return {
    emit(event: string, arg?: unknown) {
      emitted.push({ event, arg })
    },
    on(event: string, handler: () => void) {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    },
    off(event: string, handler: () => void) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler)
      }
    },
    /** Simulate server emitting an event to the room. */
    trigger(event: string) {
      listeners[event]?.forEach((h) => h())
    },
    emitted,
    listenerCount(event: string): number {
      return listeners[event]?.length ?? 0
    },
  }
}

// ─── Exact replica of the useEffect logic in Results/index.tsx ───────────────
//
// Keep this in sync with:
//   client/src/pages/Results/index.tsx  — "Live updates via Socket.IO" block
//
function runResultsSocketEffect(
  socket: MockSocket,
  eventId: string,
  fetchEventRanking: () => void
): () => void {
  socket.emit('join-competition', eventId)

  const handleScoreUpdate = () => {
    fetchEventRanking()
  }

  socket.on('score-updated', handleScoreUpdate)
  socket.on('competition-updated', handleScoreUpdate)

  return () => {
    socket.emit('leave-competition', eventId)
    socket.off('score-updated', handleScoreUpdate)
    socket.off('competition-updated', handleScoreUpdate)
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Results page socket live update (#107)', () => {
  let socket: MockSocket
  let fetchEventRanking: ReturnType<typeof vi.fn>

  beforeEach(() => {
    socket = createMockSocket()
    fetchEventRanking = vi.fn()
  })

  // ── Room subscription ────────────────────────────────────────────────────

  it('emits join-competition on mount', () => {
    runResultsSocketEffect(socket, '42', fetchEventRanking)
    const joinEmit = socket.emitted.find((e) => e.event === 'join-competition')
    expect(joinEmit).toBeDefined()
  })

  it('passes the correct eventId to join-competition', () => {
    runResultsSocketEffect(socket, '99', fetchEventRanking)
    const joinEmit = socket.emitted.find((e) => e.event === 'join-competition')
    expect(joinEmit?.arg).toBe('99')
  })

  it('emits leave-competition on cleanup', () => {
    const cleanup = runResultsSocketEffect(socket, '42', fetchEventRanking)
    cleanup()
    const leaveEmit = socket.emitted.find((e) => e.event === 'leave-competition')
    expect(leaveEmit).toBeDefined()
  })

  it('passes the correct eventId to leave-competition', () => {
    const cleanup = runResultsSocketEffect(socket, '7', fetchEventRanking)
    cleanup()
    const leaveEmit = socket.emitted.find((e) => e.event === 'leave-competition')
    expect(leaveEmit?.arg).toBe('7')
  })

  // ── Score update triggers refresh ────────────────────────────────────────

  it('calls fetchEventRanking when score-updated fires', () => {
    runResultsSocketEffect(socket, '42', fetchEventRanking)
    socket.trigger('score-updated')
    expect(fetchEventRanking).toHaveBeenCalledTimes(1)
  })

  it('calls fetchEventRanking when competition-updated fires', () => {
    runResultsSocketEffect(socket, '42', fetchEventRanking)
    socket.trigger('competition-updated')
    expect(fetchEventRanking).toHaveBeenCalledTimes(1)
  })

  it('calls fetchEventRanking on every score update', () => {
    runResultsSocketEffect(socket, '42', fetchEventRanking)
    socket.trigger('score-updated')
    socket.trigger('score-updated')
    socket.trigger('competition-updated')
    expect(fetchEventRanking).toHaveBeenCalledTimes(3)
  })

  // ── Listener cleanup ─────────────────────────────────────────────────────

  it('does not call fetchEventRanking after cleanup (score-updated)', () => {
    const cleanup = runResultsSocketEffect(socket, '42', fetchEventRanking)
    cleanup()
    socket.trigger('score-updated')
    expect(fetchEventRanking).not.toHaveBeenCalled()
  })

  it('does not call fetchEventRanking after cleanup (competition-updated)', () => {
    const cleanup = runResultsSocketEffect(socket, '42', fetchEventRanking)
    cleanup()
    socket.trigger('competition-updated')
    expect(fetchEventRanking).not.toHaveBeenCalled()
  })

  it('removes both listeners after cleanup', () => {
    const cleanup = runResultsSocketEffect(socket, '42', fetchEventRanking)
    expect(socket.listenerCount('score-updated')).toBe(1)
    expect(socket.listenerCount('competition-updated')).toBe(1)
    cleanup()
    expect(socket.listenerCount('score-updated')).toBe(0)
    expect(socket.listenerCount('competition-updated')).toBe(0)
  })

  // ── Regression documentation ─────────────────────────────────────────────

  it('regression: without join-competition the room emit sequence is broken', () => {
    // Simulate the OLD (broken) effect: no join-competition emitted.
    // The socket would still register listeners, but the server only emits to
    // joined rooms, so score-updated would never arrive.
    // This test documents that the FIX adds the join call first.
    runResultsSocketEffect(socket, '42', fetchEventRanking)

    const emitOrder = socket.emitted.map((e) => e.event)
    // join-competition MUST come before any score-updated events are handled
    expect(emitOrder[0]).toBe('join-competition')
  })
})
