import { publicationActions } from './host-models';

describe('publicationActions', () => {
  it('should offer publish, review and archive from a draft', () => {
    expect(publicationActions('BORRADOR').map((option) => option.action)).toEqual([
      'publish',
      'request-review',
      'archive',
    ]);
  });

  it('should offer pause, hide, review and archive when published', () => {
    expect(publicationActions('PUBLICADA').map((option) => option.action)).toEqual([
      'pause',
      'hide',
      'request-review',
      'archive',
    ]);
  });

  it('should offer publish, hide, review and archive when paused', () => {
    expect(publicationActions('PAUSADA').map((option) => option.action)).toEqual([
      'publish',
      'hide',
      'request-review',
      'archive',
    ]);
  });

  it('should offer only publish and archive when hidden', () => {
    expect(publicationActions('OCULTA').map((option) => option.action)).toEqual([
      'publish',
      'archive',
    ]);
  });

  it('should not offer host actions under review or when archived', () => {
    expect(publicationActions('EN_REVISION')).toEqual([]);
    expect(publicationActions('ARCHIVADA')).toEqual([]);
  });
});
