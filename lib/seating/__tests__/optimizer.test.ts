import { describe, it, expect, vi, beforeEach } from 'vitest';

const { __mockDb: mockDb } = await import('@neondatabase/serverless') as any;

// Mock anthropic client
vi.mock('@/lib/anthropic', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          assignments: [
            { guest_index: 0, table_number: 1, rationale: 'Industry leader', confidence: 0.9 },
            { guest_index: 1, table_number: 1, rationale: 'Complementary background', confidence: 0.8 },
            { guest_index: 2, table_number: 2, rationale: 'Score balanced', confidence: 0.7 },
          ]
        })}],
      }),
    },
  })),
}));

describe('seating optimizer', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  describe('generateSeatingPlan', () => {
    it('throws when event not found', async () => {
      mockDb.mockResolvedValueOnce([]); // event query
      const { generateSeatingPlan } = await import('../optimizer');
      await expect(generateSeatingPlan(999, 'ws-1', 'MIXED_INTERESTS'))
        .rejects.toThrow('Event not found');
    });

    it('returns empty assignments when no guests', async () => {
      mockDb
        .mockResolvedValueOnce([{ title: 'Test Event', total_capacity: 50, seating_format: null, tables_config: null }])
        .mockResolvedValueOnce([]); // no guests
      const { generateSeatingPlan } = await import('../optimizer');
      const result = await generateSeatingPlan(1, 'ws-1', 'MIXED_INTERESTS');
      expect(result.assignments).toEqual([]);
      expect(result.batchId).toBeDefined();
    });

    it('generates seating plan with AI response', async () => {
      // Event
      mockDb.mockResolvedValueOnce([{
        title: 'Test Event',
        total_capacity: 20,
        seating_format: 'ROUND_TABLES',
        tables_config: { tables: [{ number: 1, seats: 10 }, { number: 2, seats: 10 }] },
      }]);
      // Guests
      mockDb.mockResolvedValueOnce([
        { contact_id: 'c1', full_name: 'Alice', company: 'Acme', title: 'CEO', industry: 'Tech', tags: [], relevance_score: 90, score_rationale: 'Great fit', talking_points: [] },
        { contact_id: 'c2', full_name: 'Bob', company: 'Beta', title: 'CTO', industry: 'Finance', tags: [], relevance_score: 80, score_rationale: 'Good fit', talking_points: [] },
        { contact_id: 'c3', full_name: 'Carol', company: 'Gamma', title: 'VP', industry: 'Health', tags: [], relevance_score: 70, score_rationale: 'Decent', talking_points: [] },
      ]);
      // DB inserts for each seating suggestion (3 inserts)
      mockDb.mockResolvedValue([]);

      const { generateSeatingPlan } = await import('../optimizer');
      const result = await generateSeatingPlan(1, 'ws-1', 'MIXED_INTERESTS');

      expect(result.batchId).toBeDefined();
      expect(result.assignments).toHaveLength(3);
      expect(result.assignments[0].contact_id).toBe('c1');
      expect(result.assignments[0].table_number).toBe(1);
      expect(result.assignments[0].confidence).toBe(0.9);
    });
  });

  describe('generateIntroductionPairings', () => {
    it('returns empty when fewer than 2 guests', async () => {
      mockDb
        .mockResolvedValueOnce([{ title: 'Test' }]) // event
        .mockResolvedValueOnce([]) // objectives
        .mockResolvedValueOnce([{ contact_id: 'c1', full_name: 'Solo', company: null, title: null, industry: null, tags: [], relevance_score: null, score_rationale: null, talking_points: [] }]); // only 1 guest

      const { generateIntroductionPairings } = await import('../optimizer');
      const result = await generateIntroductionPairings(1, 'ws-1');
      expect(result.pairings).toEqual([]);
    });
  });

  describe('applySeatingAssignment', () => {
    it('updates campaign invitation table assignment', async () => {
      mockDb.mockResolvedValueOnce([]);
      const { applySeatingAssignment } = await import('../optimizer');
      await applySeatingAssignment(1, 'ws-1', 'c1', 3, 5);
      expect(mockDb).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSeatingAssignments', () => {
    it('returns seating data from DB', async () => {
      const data = [
        { invitation_id: 'inv-1', contact_id: 'c1', full_name: 'Alice', company: 'Acme', title: 'CEO', table_assignment: 1, seat_assignment: 1, status: 'ACCEPTED', relevance_score: 90 },
      ];
      mockDb.mockResolvedValueOnce(data);

      const { getSeatingAssignments } = await import('../optimizer');
      const result = await getSeatingAssignments(1, 'ws-1');
      expect(result).toEqual(data);
    });
  });
});
