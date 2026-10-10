import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PushApi } from './push-api';

const TOKEN = {
  id: 't1',
  platform: 'WEB',
  createdAt: '2026-10-28T10:00:00Z',
  lastSeenAt: '2026-10-28T10:00:00Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(PushApi), http: TestBed.inject(HttpTestingController) };
}

describe('PushApi (contratos reales)', () => {
  it('registers the FCM token of the current device', async () => {
    const { api, http } = setup();

    const requestPromise = api.register('token-1');
    const request = http.expectOne('/api/v1/users/me/push-tokens');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'token-1', platform: 'WEB' });
    request.flush(TOKEN);

    await expect(requestPromise).resolves.toMatchObject({ platform: 'WEB' });
  });

  it('removes the token through the query parameter', async () => {
    const { api, http } = setup();

    const requestPromise = api.unregister('token-1');
    const request = http.expectOne((candidate) => candidate.url === '/api/v1/users/me/push-tokens');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.params.get('token')).toBe('token-1');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(requestPromise).resolves.toBeNull();
  });
});
