/**
 * Squad Auto-Assignment E2E Tests
 *
 * Tests the automatic squad assignment feature:
 * - Auto-assign button visibility
 * - Dialog opens with criteria form
 * - Proposal generation via API
 * - Proposal review and apply flow
 *
 * Uses Event A (created by setup) for testing with real participants.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish } from '../helpers';
import { loadEventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

test.describe('Squad Auto-Assignment', () => {

  test.describe('UI Elements', () => {

    test('auto-assign button is visible on squad management page', async ({ page }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }
      await navigateTo(page, `/squad-management?eventId=${state.eventId}`);
      await waitForLoadingToFinish(page);

      const autoAssignBtn = page.getByRole('button', { name: /automatische|auto assign/i });
      await expect(autoAssignBtn).toBeVisible();
    });

    test('clicking auto-assign button opens dialog', async ({ page }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }
      await navigateTo(page, `/squad-management?eventId=${state.eventId}`);
      await waitForLoadingToFinish(page);

      const autoAssignBtn = page.getByRole('button', { name: /automatische|auto assign/i });
      await autoAssignBtn.click();

      // Dialog should be visible with criteria step
      await expect(page.getByText(/Automatische Riegeneinteilung|Automatic Squad Assignment/i)).toBeVisible();
      await expect(page.getByText(/Kriterien|Criteria/i).first()).toBeVisible();
    });

    test('auto-assign dialog has all criteria fields', async ({ page }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }
      await navigateTo(page, `/squad-management?eventId=${state.eventId}`);
      await waitForLoadingToFinish(page);

      await page.getByRole('button', { name: /automatische|auto assign/i }).click();

      // Check criteria fields are present
      await expect(page.getByText(/Max.*Teilnehmer.*Riege|Max participants/i).first()).toBeVisible();
      await expect(page.getByText(/Anzahl Vorschläge|Number of proposals/i).first()).toBeVisible();
      await expect(page.getByText(/Namensgebung|Naming/i).first()).toBeVisible();
      await expect(page.getByText(/Geschlechter trennen|Separate genders/i).first()).toBeVisible();
      await expect(page.getByText(/Vereinsmitglieder.*zusammen|Keep club members/i).first()).toBeVisible();
    });

    test('auto-assign dialog can be closed', async ({ page }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }
      await navigateTo(page, `/squad-management?eventId=${state.eventId}`);
      await waitForLoadingToFinish(page);

      await page.getByRole('button', { name: /automatische|auto assign/i }).click();
      await expect(page.getByText(/Automatische Riegeneinteilung|Automatic Squad Assignment/i)).toBeVisible();

      // Close via cancel button
      await page.getByRole('button', { name: /Abbrechen|Cancel/i }).click();
      await expect(page.getByText(/Automatische Riegeneinteilung|Automatic Squad Assignment/i)).not.toBeVisible();
    });
  });

  test.describe('API — Generate Proposals', () => {

    test('generate proposals returns valid structure', async ({ request }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }

      const response = await request.post(`${API_BASE}/squad-management/auto-assign/generate`, {
        data: {
          eventId: state.eventId,
          maxParticipantsPerSquad: 6,
          separateGenders: true,
          keepClubsTogether: false,
          groupByAgeCategory: false,
          numberOfProposals: 2,
          namingPrefix: 'gender',
          breakCount: 0,
        },
      });

      expect(response.ok()).toBe(true);
      const body = await response.json();

      expect(body.proposals).toBeDefined();
      expect(body.proposals.length).toBe(2);
      expect(body.totalParticipants).toBeGreaterThan(0);

      // Each proposal should have squads with participants
      for (const proposal of body.proposals) {
        expect(proposal.id).toBeGreaterThan(0);
        expect(proposal.squads.length).toBeGreaterThan(0);
        expect(proposal.stats.totalParticipants).toBe(body.totalParticipants);

        for (const squad of proposal.squads) {
          expect(squad.name.length).toBeLessThanOrEqual(5);
          expect(squad.participants.length).toBeLessThanOrEqual(6);
        }
      }
    });

    test('generate proposals with gender separation', async ({ request }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }

      const response = await request.post(`${API_BASE}/squad-management/auto-assign/generate`, {
        data: {
          eventId: state.eventId,
          maxParticipantsPerSquad: 12,
          separateGenders: true,
          keepClubsTogether: false,
          groupByAgeCategory: false,
          numberOfProposals: 1,
          namingPrefix: 'gender',
          breakCount: 0,
        },
      });

      expect(response.ok()).toBe(true);
      const body = await response.json();
      const proposal = body.proposals[0];

      // Each squad should have participants of only one gender
      for (const squad of proposal.squads) {
        if (squad.isBreak) continue;
        const genders = new Set(squad.participants.map((p: any) => p.gender));
        expect(genders.size).toBeLessThanOrEqual(1);
      }
    });

    test('generate proposals with breaks', async ({ request }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }

      const response = await request.post(`${API_BASE}/squad-management/auto-assign/generate`, {
        data: {
          eventId: state.eventId,
          maxParticipantsPerSquad: 12,
          separateGenders: false,
          keepClubsTogether: false,
          groupByAgeCategory: false,
          numberOfProposals: 1,
          namingPrefix: 'gender',
          breakCount: 2,
        },
      });

      expect(response.ok()).toBe(true);
      const body = await response.json();
      const proposal = body.proposals[0];

      const breakSquads = proposal.squads.filter((s: any) => s.isBreak);
      expect(breakSquads.length).toBe(2);
      expect(proposal.stats.breakSquads).toBe(2);
    });

    test('generate proposals with numbered naming', async ({ request }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }

      const response = await request.post(`${API_BASE}/squad-management/auto-assign/generate`, {
        data: {
          eventId: state.eventId,
          maxParticipantsPerSquad: 12,
          separateGenders: false,
          keepClubsTogether: false,
          groupByAgeCategory: false,
          numberOfProposals: 1,
          namingPrefix: 'number',
          breakCount: 0,
        },
      });

      expect(response.ok()).toBe(true);
      const body = await response.json();

      for (const squad of body.proposals[0].squads) {
        expect(squad.name).toMatch(/^R\d{2}$/);
      }
    });

    test('rejects invalid event with no participants', async ({ request }) => {
      const response = await request.post(`${API_BASE}/squad-management/auto-assign/generate`, {
        data: {
          eventId: 99999,
          maxParticipantsPerSquad: 12,
          separateGenders: true,
          keepClubsTogether: false,
          groupByAgeCategory: false,
          numberOfProposals: 1,
          namingPrefix: 'gender',
          breakCount: 0,
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('API — Apply Proposal', () => {

    test('apply proposal assigns participants to squads', async ({ request }) => {
      const state = loadEventAState();
      if (!state) {
        test.skip();
        return;
      }

      // First generate a proposal
      const genResponse = await request.post(`${API_BASE}/squad-management/auto-assign/generate`, {
        data: {
          eventId: state.eventId,
          maxParticipantsPerSquad: 10,
          separateGenders: true,
          keepClubsTogether: false,
          groupByAgeCategory: false,
          numberOfProposals: 1,
          namingPrefix: 'gender',
          breakCount: 0,
        },
      });

      expect(genResponse.ok()).toBe(true);
      const genBody = await genResponse.json();
      const proposal = genBody.proposals[0];

      // Apply the proposal
      const squads = proposal.squads
        .filter((s: any) => !s.isBreak)
        .map((s: any) => ({
          name: s.name,
          participantIds: s.participants.map((p: any) => p.id),
        }));

      const applyResponse = await request.post(`${API_BASE}/squad-management/auto-assign/apply`, {
        data: {
          eventId: state.eventId,
          squads,
          clearExisting: true,
        },
      });

      expect(applyResponse.ok()).toBe(true);
      const applyBody = await applyResponse.json();
      expect(applyBody.success).toBe(true);
      expect(applyBody.participantsAssigned).toBeGreaterThan(0);

      // Verify the squads were actually created
      const squadsResponse = await request.get(
        `${API_BASE}/squad-management?eventId=${state.eventId}`
      );
      expect(squadsResponse.ok()).toBe(true);
      const squadsBody = await squadsResponse.json();
      expect(squadsBody.squads.length).toBeGreaterThan(0);

      // Clean up: remove all squad assignments
      await request.post(`${API_BASE}/squad-management/auto-assign/apply`, {
        data: {
          eventId: state.eventId,
          squads: [],
          clearExisting: true,
        },
      });
    });
  });
});
