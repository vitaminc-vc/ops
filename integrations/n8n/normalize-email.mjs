// n8n's Gmail Trigger parses MIME with Simplify disabled. Attachments are not downloaded.
export function normalizeEmail(mail) {
  if (!mail || !/^[a-f0-9]+$/i.test(mail.id || '')) throw new Error('Missing Gmail message ID.');
  if (mail.labelIds?.some(label => ['SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label))) return null;
  const address = value => typeof value === 'string' ? value : value?.text || value?.value?.map(v => v.address).join(', ') || '';
  const body = typeof mail.text === 'string' ? mail.text.trim() : '';
  // Gmail's MIME parser produces text for HTML mail. Never substitute the truncated snippet.
  if (!body) throw new Error('No full email text was returned; inspect the Gmail MIME output.');
  const date = new Date(mail.date);
  const receivedAt = Number.isNaN(date.getTime()) ? '' : date.toISOString();
  const subject = String(mail.subject || '(No subject)');
  const from = address(mail.from), to = address(mail.to);
  const threadId = String(mail.threadId || mail.id);
  const sourceUrl = `https://mail.google.com/mail/u/?authuser=luke%40vitaminc.vc#all/${threadId}`;
  return {
    content: `Email subject: ${subject}\nFrom: ${from}\nTo: ${to}\nDate: ${receivedAt || 'Unknown'}\nMailbox: luke@vitaminc.vc\n\n${body}`,
    customId: `vitaminc_luke_gmail_${mail.id}`,
    containerTag: 'vitaminc_email_admin',
    taskType: 'superrag',
    metadata: { sourceType: 'email', provider: 'Gmail', mailbox: 'luke@vitaminc.vc', gmailMessageId: mail.id, gmailThreadId: threadId, subject, from, to, receivedAt, sourceUrl, visibility: 'admin', ingestionVersion: 1 },
  };
}
