import type { AnalyticsMetrics, TeamPerformance } from '@/types/phase4';

/**
 * Export analytics data as CSV or JSON.
 */
export function exportAnalyticsReport(
  metrics: AnalyticsMetrics,
  team: TeamPerformance[],
  format: 'csv' | 'json'
): { content: string; contentType: string; filename: string } {
  if (format === 'json') {
    return {
      content: JSON.stringify({ metrics, team_performance: team }, null, 2),
      contentType: 'application/json',
      filename: 'analytics-report.json',
    };
  }

  // CSV format
  const lines: string[] = [];

  // Headline metrics
  lines.push('Metric,Value');
  lines.push(`Guest Pool,${metrics.headline.guest_pool}`);
  lines.push(`Scored,${metrics.headline.scored}`);
  lines.push(`Invited,${metrics.headline.invited}`);
  lines.push(`Accepted,${metrics.headline.accepted}`);
  lines.push(`Checked In,${metrics.headline.checked_in}`);
  lines.push(`Walk-ins,${metrics.headline.walk_ins}`);
  lines.push(`Follow-ups Sent,${metrics.headline.follow_ups_sent}`);
  lines.push(`Meetings Booked,${metrics.headline.meetings_booked}`);
  lines.push(`Broadcasts Sent,${metrics.headline.broadcasts_sent}`);
  lines.push('');

  // Funnel
  lines.push('Funnel Stage,Count');
  for (const stage of metrics.funnel) {
    lines.push(`${stage.label},${stage.count}`);
  }
  lines.push('');

  // Score distribution
  lines.push('Score Range,Count');
  for (const bucket of metrics.score_distribution) {
    lines.push(`${bucket.range},${bucket.count}`);
  }
  lines.push('');

  // Campaign summary
  lines.push('Campaign,Invited,Accepted,Declined,Acceptance Rate');
  for (const c of metrics.campaign_summary) {
    lines.push(`"${c.campaign_name}",${c.total_invited},${c.total_accepted},${c.total_declined},${c.acceptance_rate}%`);
  }
  lines.push('');

  // Team performance
  if (team.length > 0) {
    lines.push('Team Member,Email,Assigned Guests,Checked In,Follow-ups Sent,Meetings Booked');
    for (const t of team) {
      lines.push(`"${t.user_name}",${t.user_email},${t.assigned_guests},${t.checked_in_guests},${t.follow_ups_sent},${t.meetings_booked}`);
    }
  }

  return {
    content: lines.join('\n'),
    contentType: 'text/csv',
    filename: 'analytics-report.csv',
  };
}
