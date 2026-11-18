import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authRepository from '../../auth/auth.repository.js';
import { sendExpoPush } from '../expoPush.js';

afterEach(() => vi.restoreAllMocks());

const notification = { _id: 'n1', title: 'Task assigned', message: 'Fix the logo', link: '/tasks/7', type: 'task_assigned', priority: 'high' };

describe('sendExpoPush', () => {
  it('sends to every phone and forgets the ones Expo no longer knows', async () => {
    vi.spyOn(authRepository, 'findPushTokens').mockResolvedValue(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
    const remove = vi.spyOn(authRepository, 'removePushTokens').mockResolvedValue();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [{ status: 'ok', id: 't1' }, { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }],
    })));

    await sendExpoPush('u1', notification);

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.map((m) => m.to)).toEqual(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
    expect(sent[0]).toMatchObject({ title: 'Task assigned', body: 'Fix the logo', priority: 'high', data: { id: 'n1', link: '/tasks/7' } });
    expect(remove).toHaveBeenCalledWith('u1', ['ExponentPushToken[b]']);
  });

  it('does nothing for a user with no phones', async () => {
    vi.spyOn(authRepository, 'findPushTokens').mockResolvedValue([]);
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await sendExpoPush('u1', notification);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
