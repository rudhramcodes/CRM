import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authRepository from '../../auth/auth.repository.js';
import * as notifRepo from '../notification.repository.js';
import { sendExpoPush } from '../expoPush.js';
import { pushStyle } from '../pushStyle.js';

afterEach(() => vi.restoreAllMocks());

const notification = { _id: 'n1', title: 'Task assigned', message: 'Fix the logo', link: '/tasks/7', type: 'task_assigned', priority: 'high' };

describe('sendExpoPush', () => {
  it('sends to every phone and forgets the ones Expo no longer knows', async () => {
    vi.spyOn(authRepository, 'findPushTokens').mockResolvedValue(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
    vi.spyOn(notifRepo, 'countUnreadByRecipient').mockResolvedValue(3);
    const remove = vi.spyOn(authRepository, 'removePushTokens').mockResolvedValue();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [{ status: 'ok', id: 't1' }, { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }],
    })));

    await sendExpoPush('u1', notification);

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.map((m) => m.to)).toEqual(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
    expect(sent[0]).toMatchObject({
      title: 'Task assigned', body: 'Fix the logo', priority: 'high', badge: 3, sound: 'default',
      channelId: 'tasks', categoryId: 'task_new', interruptionLevel: 'active', data: { id: 'n1', link: '/tasks/7' },
    });
    expect(remove).toHaveBeenCalledWith('u1', ['ExponentPushToken[b]']);
  });

  it('does nothing for a user with no phones', async () => {
    vi.spyOn(authRepository, 'findPushTokens').mockResolvedValue([]);
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await sendExpoPush('u1', notification);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('pushStyle', () => {
  it('stacks one task\'s notifications together', () => {
    expect(pushStyle({ type: 'task_comment', referenceModel: 'Task', referenceId: 't9' })).toMatchObject({ threadId: 'Task:t9', categoryId: 'chat', channelId: 'chat' });
  });
  it('lets a late review break through Focus', () => {
    expect(pushStyle({ type: 'task_review_late' }).interruptionLevel).toBe('time-sensitive');
  });
  it('keeps FYI updates quiet and unknown types normal', () => {
    expect(pushStyle({ type: 'task_status_change' })).toMatchObject({ interruptionLevel: 'passive', priority: 'normal' });
    expect(pushStyle({ type: 'something_new' })).toMatchObject({ channelId: 'default', interruptionLevel: 'active', priority: 'high' });
  });
});
