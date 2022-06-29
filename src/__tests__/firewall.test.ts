/* eslint-env jest */

import { Client } from '..';
import { wrapWithDone } from './utils';

// eslint-disable-next-line
const genConnectionMetadata = require('../../debug/genConnectionMetadata');

// eslint-disable-next-line
const WebSocket = require('ws');

jest.setTimeout(30 * 1000);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testingClients: Array<Client<any>> = [];

// Just a helper that to help us exit from jest without any open handles
function getClient<Ctx = null>(done: jest.DoneCallback) {
  const c = new Client<Ctx>();
  c.setUnrecoverableErrorHandler(done);
  testingClients.push(c);

  return c;
}

afterAll(() => {
  testingClients.forEach((c) => c.destroy());
});

test('handles firewall denied condition specifically', (done) => {
  const client = getClient<{ username: string }>(done);

  const ctx = { username: 'zyzz' };

  client.open(
    {
      fetchConnectionMetadata: () =>
        Promise.resolve({
          ...genConnectionMetadata(),
          error: null,
        }),
      WebSocketClass: WebSocket,
      context: ctx,
    },
    () => {
      const firewalledClient = getClient<{ username: string }>(done);

      firewalledClient.onFirewallDenied = wrapWithDone(done, () => {
        return () => {
          done();
        };
      });

      const firewalledCtx = { username: 'firewallzyzz' };

      firewalledClient.open(
        {
          fetchConnectionMetadata: () =>
            Promise.resolve({
              ...genConnectionMetadata({ restrictNetwork: true }),
              error: null,
            }),
          WebSocketClass: WebSocket,
          context: firewalledCtx,
        },
        () => {
          // Just clean up, the important thing is to check whether
          // onFirewallDenied runs as expected
          client.close();
          firewalledClient.close();
        },
      );
    },
  );
});
