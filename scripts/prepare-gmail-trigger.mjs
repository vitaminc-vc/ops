import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Adapt an exported live workflow while preserving its identity, downstream nodes and credentials.
const source = process.argv[2], destination = process.argv[3];
if (!source || !destination) throw Error('Provide the exported workflow and destination paths.');
const workflow = JSON.parse(readFileSync(source, 'utf8'));
const template = JSON.parse(readFileSync('integrations/n8n/vitaminc-email-brain.json', 'utf8'));
assert.equal(workflow.id, 'nQZOH7AFAwTHkjkf');
assert.equal(workflow.nodes.filter(node => node.type === 'n8n-nodes-base.scheduleTrigger').length, 1);
assert.ok(!workflow.nodes.some(node => node.type === 'n8n-nodes-base.gmailTrigger'));
const schedule = workflow.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger');
const originalName = schedule.name, position = [...schedule.position];
assert.equal(workflow.connections[originalName]?.main?.[0]?.[0]?.node, 'Load Gmail labels');
schedule.name = 'Daily recovery scan';
schedule.parameters = template.nodes.find(node => node.name === schedule.name).parameters;
schedule.position = [position[0], position[1] + 140];
workflow.connections[schedule.name] = workflow.connections[originalName];
delete workflow.connections[originalName];
const credential = workflow.nodes.find(node => node.name === 'Load Gmail labels').credentials;
assert.ok(credential?.gmailOAuth2?.id);
const trigger = structuredClone(template.nodes.find(node => node.type === 'n8n-nodes-base.gmailTrigger'));
trigger.id = randomUUID(); trigger.position = [position[0], position[1] - 140]; trigger.credentials = structuredClone(credential);
workflow.nodes.unshift(trigger);
workflow.connections[trigger.name] = { main: [[{ node: 'Load Gmail labels', type: 'main', index: 0 }]] };
workflow.nodes.find(node => node.name === 'Unindexed inbound email').parameters.limit = 50;
workflow.nodes.find(node => node.name === 'Email knowledge').parameters = template.nodes.find(node => node.name === 'Email knowledge').parameters;
workflow.pinData = {};
// n8n creates a new version when saving; preserve the existing workflow ID and settings.
delete workflow.versionId; delete workflow.versionCounter; delete workflow.activeVersionId;
writeFileSync(destination, JSON.stringify(workflow, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ workflowId: workflow.id, triggers: [trigger.name, schedule.name], credentialPreserved: true, pinnedDataRemoved: true, nodes: workflow.nodes.length }));
