import type { AnalyticsMetrics, TeamPerformance } from '@/types/phase4';

/**
 * Export analytics data as CSV, JSON, or PDF.
 */
export async function exportAnalyticsReport(
  metrics: AnalyticsMetrics,
  team: TeamPerformance[],
  format: 'csv' | 'json' | 'pdf'
): Promise<{ content: string; contentType: string; filename: string }> {
  if (format === 'json') {
    return {
      content: JSON.stringify({ metrics, team_performance: team }, null, 2),
      contentType: 'application/json',
      filename: 'analytics-report.json',
    };
  }

  if (format === 'pdf') {
    return generatePdfReport(metrics, team);
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

/**
 * Generate a branded PDF analytics report using jsPDF.
 */
async function generatePdfReport(
  metrics: AnalyticsMetrics,
  team: TeamPerformance[]
): Promise<{ content: string; contentType: string; filename: string }> {
  // Dynamic import to avoid bundling jsPDF on every page
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  // Brand colors
  const terracotta = [184, 117, 94] as [number, number, number];
  const charcoal = [28, 28, 30] as [number, number, number];
  const forestGreen = [47, 79, 63] as [number, number, number];

  // Header bar
  doc.setFillColor(...terracotta);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Moots Event Analytics Report', 14, 20);

  // Timestamp
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 14, 27);

  // Headline metrics
  let y = 40;
  doc.setTextColor(...charcoal);
  doc.setFontSize(14);
  doc.text('Headline Metrics', 14, y);
  y += 8;

  const headlineData = [
    ['Guest Pool', String(metrics.headline.guest_pool)],
    ['Scored', String(metrics.headline.scored)],
    ['Invited', String(metrics.headline.invited)],
    ['Accepted', String(metrics.headline.accepted)],
    ['Checked In', String(metrics.headline.checked_in)],
    ['Walk-ins', String(metrics.headline.walk_ins)],
    ['Follow-ups Sent', String(metrics.headline.follow_ups_sent)],
    ['Meetings Booked', String(metrics.headline.meetings_booked)],
    ['Broadcasts Sent', String(metrics.headline.broadcasts_sent)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: headlineData,
    headStyles: { fillColor: forestGreen },
    margin: { left: 14 },
    theme: 'striped',
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Score distribution
  doc.setFontSize(14);
  doc.text('Score Distribution', 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Score Range', 'Count']],
    body: metrics.score_distribution.map(b => [b.range, String(b.count)]),
    headStyles: { fillColor: forestGreen },
    margin: { left: 14 },
    theme: 'striped',
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Campaign summary
  if (metrics.campaign_summary.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text('Campaign Summary', 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Campaign', 'Invited', 'Accepted', 'Declined', 'Rate']],
      body: metrics.campaign_summary.map(c => [
        c.campaign_name,
        String(c.total_invited),
        String(c.total_accepted),
        String(c.total_declined),
        `${c.acceptance_rate}%`,
      ]),
      headStyles: { fillColor: forestGreen },
      margin: { left: 14 },
      theme: 'striped',
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Team performance
  if (team.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text('Team Performance', 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Name', 'Email', 'Assigned', 'Checked In', 'Follow-ups', 'Meetings']],
      body: team.map(t => [
        t.user_name,
        t.user_email,
        String(t.assigned_guests),
        String(t.checked_in_guests),
        String(t.follow_ups_sent),
        String(t.meetings_booked),
      ]),
      headStyles: { fillColor: forestGreen },
      margin: { left: 14 },
      theme: 'striped',
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by Moots — Page ${i} of ${pageCount}`, 14, 290);
  }

  // Convert to base64
  const pdfOutput = doc.output('datauristring');

  return {
    content: pdfOutput,
    contentType: 'application/pdf',
    filename: 'analytics-report.pdf',
  };
}
