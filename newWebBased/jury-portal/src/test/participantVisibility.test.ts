import { describe, expect, it } from 'vitest';
import { excludeNonStartingParticipants } from '../utils/participantVisibility';

describe('excludeNonStartingParticipants', () => {
  it('filters participants marked as startet_nicht=true', () => {
    const participants = [
      { id: 1, firstname: 'Anna', startet_nicht: false },
      { id: 2, firstname: 'Berta', startet_nicht: true },
      { id: 3, firstname: 'Clara' }
    ];

    const visible = excludeNonStartingParticipants(participants);

    expect(visible.map(p => p.id)).toEqual([1, 3]);
  });

  it('keeps all participants when startet_nicht is false or undefined', () => {
    const participants = [
      { id: 1, startet_nicht: false },
      { id: 2 }
    ];

    const visible = excludeNonStartingParticipants(participants);

    expect(visible).toHaveLength(2);
  });
});
