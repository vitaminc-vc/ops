// n8n Code node: read complete parsed MIME messages and binary attachments.
const address = value => typeof value === 'string' ? value : value?.text || value?.value?.map(v => v.address).join(', ') || '';
const groups = new Map();
for (const [index, item] of $input.all().entries()) {
  const mail = item.json;
  if (!/^[a-f0-9]+$/i.test(mail.id || '') || !mail.threadId) throw new Error('Incomplete Gmail message identity.');
  const thread = groups.get(mail.threadId) || new Map();
  if (thread.has(mail.id)) continue;
  const attachments = [];
  for (const [key, metadata] of Object.entries(item.binary || {})) {
    const buffer = await this.helpers.getBinaryDataBuffer(index, key);
    attachments.push({ name: metadata.fileName || key, mimeType: metadata.mimeType || 'application/octet-stream', data: buffer.toString('base64') });
  }
  thread.set(mail.id, { mail, attachments }); groups.set(mail.threadId, thread);
}
const result = [];
for (const [index, originalItem] of $('Unindexed inbound email').all().entries()) {
  const original = originalItem.json;
  if (original.labelIds?.some(label => ['SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label))) continue;
  const members = [...(groups.get(original.threadId)?.values() || [])];
  const originalFull = members.find(member => member.mail.id === original.id)?.mail;
  if (!originalFull || !members.length) throw new Error('Complete thread could not be loaded.');
  const body = members.map(({ mail }) => {
    if (typeof mail.text !== 'string' || !mail.text.trim()) throw new Error('Full message text is missing. Gmail snippets cannot be used for screening.');
    return `From: ${address(mail.from)}\nSubject: ${mail.subject || '(No subject)'}\n\n${mail.text}`;
  }).join('\n\n----- Thread message -----\n\n');
  const attachments = members.flatMap(member => member.attachments);
  result.push({ json: { mailbox: 'luke@vitaminc.vc', messageId: original.id, threadId: original.threadId,
    from: address(originalFull.from), to: address(originalFull.to), subject: String(originalFull.subject || '(No subject)'),
    body, receivedAt: new Date(originalFull.date).toISOString(), labels: original.labelIds || [], attachments }, pairedItem: { item: 0 } });
}
return result;
