import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ListingsApi } from '../data-access/listings-api';
import { FavoritesStore } from './favorites-store';

function setup() {
  const api = {
    list: vi.fn(),
    detail: vi.fn(),
    availability: vi.fn(),
    listFavorites: vi.fn().mockResolvedValue([]),
    addFavorite: vi.fn().mockResolvedValue({ id: 'f1', publicationId: 'p1', createdAt: '' }),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({ providers: [{ provide: ListingsApi, useValue: api }] });
  return { store: TestBed.inject(FavoritesStore), api };
}

describe('FavoritesStore', () => {
  it('should load favorites only once per instance', async () => {
    const { store, api } = setup();
    api.listFavorites.mockResolvedValue([{ id: 'f1', publicationId: 'p1', createdAt: '' }]);

    await store.load();
    await store.load();

    expect(store.isFavorite('p1')).toBe(true);
    expect(api.listFavorites).toHaveBeenCalledTimes(1);
  });

  it('should toggle a favorite on and off', async () => {
    const { store, api } = setup();

    await store.toggle('p1');
    expect(api.addFavorite).toHaveBeenCalledWith('p1');
    expect(store.isFavorite('p1')).toBe(true);

    await store.toggle('p1');
    expect(api.removeFavorite).toHaveBeenCalledWith('p1');
    expect(store.isFavorite('p1')).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should treat CONFLICT on add as already favorite', async () => {
    const { store, api } = setup();
    api.addFavorite.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'Publication is already a favorite of this user' },
      }),
    );

    await store.toggle('p1');

    expect(store.isFavorite('p1')).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('should treat NOT_FOUND on remove as already removed', async () => {
    const { store, api } = setup();
    api.listFavorites.mockResolvedValue([{ id: 'f1', publicationId: 'p1', createdAt: '' }]);
    api.removeFavorite.mockRejectedValue(
      new HttpErrorResponse({
        status: 404,
        error: { code: 'NOT_FOUND', message: 'Favorite not found' },
      }),
    );
    await store.load();

    await store.toggle('p1');

    expect(store.isFavorite('p1')).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should surface unexpected failures without changing the state', async () => {
    const { store, api } = setup();
    api.addFavorite.mockRejectedValue(
      new HttpErrorResponse({ status: 500, error: { code: 'UNKNOWN', message: 'boom' } }),
    );

    await store.toggle('p1');

    expect(store.isFavorite('p1')).toBe(false);
    expect(store.error()).toBe('boom');
  });
});
