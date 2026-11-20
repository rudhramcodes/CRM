// What a client sees of a project, and who hears project chat. Runs against a throwaway local MongoDB
// database (skipped when none is running).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import User from '../../auth/auth.model.js';
import Client from '../../clients/client.model.js';
import Notification from '../../notifications/notification.model.js';
import * as svc from '../project.service.js';

const dbName = `crm_test_project_client_${Date.now()}`;
let up = false;
try {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 2000 });
  up = true;
} catch { /* no local MongoDB: tests below are skipped */ }

const mk = (name, role) => User.create({ name, email: `${name.toLowerCase()}@test.local`, password: 'Passw0rd!x', role });
let owner; let member; let outsider; let admin; let clientUser; let client; let project;

describe.skipIf(!up)('projects and clients (database)', () => {
  beforeAll(async () => {
    [owner, member, outsider, admin, clientUser] = await Promise.all([
      mk('Meera', 'manager'), mk('Rahul', 'employee'), mk('Amit', 'employee'), mk('Asha', 'admin'), mk('Priya', 'client'),
    ]);
    client = await Client.create({ companyName: 'Acme Weddings', contactPerson: 'Priya', email: 'priya@acme.test', brand: 'panigrahna', createdBy: admin._id, user: clientUser._id, status: 'active' });
    project = await svc.createProject({
      title: 'Sharma wedding film', client: String(client._id), ownerId: String(owner._id), budget: 250000,
      teamMembers: [{ user: String(member._id), role: 'Editor' }],
    }, admin);
  });
  afterAll(async () => {
    if (!up) return;
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });
  const heard = async (msgFrom) => (await Notification.find({ type: 'project_chat', actionBy: msgFrom._id }).lean()).map((n) => String(n.recipient)).sort();

  it('a client sees the work, not budget, activity details or emails', async () => {
    const seen = await svc.getProjectById(String(project._id), clientUser, client);
    expect(seen.title).toBe('Sharma wedding film');
    expect(seen.budget).toBeUndefined();
    expect(seen.activities).toBeUndefined();
    expect(seen.qcChecklist).toBeUndefined();
    expect(seen.ownerId.email).toBeUndefined();
    expect(seen.teamMembers[0].user.email).toBeUndefined();
    const list = await svc.getProjects({}, clientUser, client);
    expect(list.projects[0].budget).toBeUndefined();
    const acts = await svc.getActivities(String(project._id), clientUser, client);
    expect(acts.every((a) => a.oldValue === undefined && !a.performedBy?.email)).toBe(true);
    // Staff still get everything.
    expect((await svc.getProjectById(String(project._id), admin)).budget).toBe(250000);
  });

  it("a client's message reaches the project's people, not the whole company", async () => {
    await svc.addMessage(String(project._id), { text: 'Can we get the teaser by Friday?' }, clientUser, client);
    await new Promise((r) => setTimeout(r, 300)); // notifications are sent without waiting
    expect(await heard(clientUser)).toEqual([String(owner._id), String(member._id)].sort());
    const msgs = await svc.getMessages(String(project._id), clientUser, client);
    expect(msgs.at(-1).createdBy.email).toBeUndefined();
  });

  it("a staff message reaches the team and the client, never the sender or outsiders", async () => {
    await svc.addMessage(String(project._id), { text: 'Teaser is rendering' }, member, null);
    await new Promise((r) => setTimeout(r, 300));
    const got = await heard(member);
    expect(got).toEqual([String(owner._id), String(clientUser._id)].sort());
    expect(got).not.toContain(String(outsider._id));
  });
});
