import { describe, it, expect } from 'vitest';
import { exportAnalyticsReport } from '../export';
import type { AnalyticsMetrics, TeamPerformance } from '@/types/phase4';

const mockMetrics: AnalyticsMetrics = {
  headline: {
    guest_pool: 100,
    scored: 80,
    invited: 60,
    accepted: 45,
    checked_in: 40,
    walk_ins: 5,
    follow_ups_sent: 30,
    meetings_booked: 10,
    broadcasts_sent: 3,
  },
  funnel: [
    { key: 'pool', label: 'Pool', count: 100, color: '#2F4F3F' },
    { key: 'scored', label: 'Scored', count: 80, color: '#B8755E' },
    { key: 'invited', label: 'Invited', count: 60, color: '#D4956A' },
    { key: 'accepted', label: 'Accepted', count: 45, color: '#6B8E6B' },
    { key: 'checked_in', label: 'Checked In', count: 40, color: '#4A7A4A' },
  ],
  score_distribution: [
    { range: '0-20', count: 5 },
    { range: '21-40', count: 15 },
    { range: '41-60', count: 25 },
    { range: '61-80', count: 20 },
    { range: '81-100', count: 15 },
  ],
  campaign_summary: [
    { campaign_id: 'c1', campaign_name: 'Wave 1', total_invited: 30, total_accepted: 25, total_declined: 5, acceptance_rate: 83 },
    { campaign_id: 'c2', campaign_name: 'Wave 2', total_invited: 30, total_accepted: 20, total_declined: 10, acceptance_rate: 67 },
  ],
};

const mockTeam: TeamPerformance[] = [
  { user_id: 'u1', user_name: 'Alice', user_email: 'alice@test.com', assigned_guests: 20, checked_in_guests: 18, follow_ups_sent: 15, meetings_booked: 5 },
  { user_id: 'u2', user_name: 'Bob', user_email: 'bob@test.com', assigned_guests: 25, checked_in_guests: 22, follow_ups_sent: 15, meetings_booked: 5 },
];

describe('exportAnalyticsReport', () => {
  it('exports JSON format', async () => {
    const result = await exportAnalyticsReport(mockMetrics, mockTeam, 'json');

    expect(result.contentType).toBe('application/json');
    expect(result.filename).toBe('analytics-report.json');

    const parsed = JSON.parse(result.content);
    expect(parsed.metrics.headline.guest_pool).toBe(100);
    expect(parsed.team_performance).toHaveLength(2);
  });

  it('exports CSV format with all sections', async () => {
    const result = await exportAnalyticsReport(mockMetrics, mockTeam, 'csv');

    expect(result.contentType).toBe('text/csv');
    expect(result.filename).toBe('analytics-report.csv');

    const lines = result.content.split('\n');

    // Check headline section
    expect(lines[0]).toBe('Metric,Value');
    expect(lines[1]).toContain('Guest Pool,100');

    // Check funnel section exists
    expect(result.content).toContain('Funnel Stage,Count');
    expect(result.content).toContain('Pool,100');

    // Check score distribution
    expect(result.content).toContain('Score Range,Count');
    expect(result.content).toContain('0-20,5');

    // Check campaigns
    expect(result.content).toContain('Campaign,Invited,Accepted,Declined,Acceptance Rate');
    expect(result.content).toContain('"Wave 1",30,25,5,83%');

    // Check team performance
    expect(result.content).toContain('Team Member,Email,Assigned Guests');
    expect(result.content).toContain('"Alice",alice@test.com');
  });

  it('exports CSV without team section when no team data', async () => {
    const result = await exportAnalyticsReport(mockMetrics, [], 'csv');
    expect(result.content).not.toContain('Team Member');
  });
});
