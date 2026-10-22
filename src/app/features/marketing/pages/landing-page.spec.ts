import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionApi } from '../../../core/auth/session-api';
import { LandingPage } from './landing-page';

function setup() {
  TestBed.configureTestingModule({
    imports: [LandingPage],
    providers: [provideRouter([]), { provide: SessionApi, useValue: { me: vi.fn() } }],
  });
}

describe('LandingPage', () => {
  it('should render the hero and the marketing sections', async () => {
    setup();
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('hogar');
    expect(compiled.querySelector('#alojamientos')).not.toBeNull();
    expect(compiled.querySelector('#comunidad')).not.toBeNull();
    expect(compiled.querySelector('#como-funciona')).not.toBeNull();
    expect(compiled.querySelector('#score')).not.toBeNull();
  });

  it('should render the four example listings with monthly prices', async () => {
    setup();
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-example-property-card').length).toBe(4);
    expect(compiled.textContent).toContain('$');
    expect(compiled.textContent).toContain('/ mes');
    expect(compiled.textContent?.toLowerCase()).not.toContain('por noche');
  });

  it('should provide a skip link to the main content', async () => {
    setup();
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a[href="#main-content"]')).not.toBeNull();
    expect(compiled.querySelector('main#main-content')).not.toBeNull();
  });
});
