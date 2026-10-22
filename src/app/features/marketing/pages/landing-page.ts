import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CATEGORIES,
  COMMUNITY_BENEFITS,
  EXAMPLE_LISTINGS,
  STEPS,
  TESTIMONIALS,
  TRUST_ITEMS,
} from '../marketing-content';
import { UiIcon } from '../../../shared/ui/icon';
import { ExamplePropertyCard } from '../ui/example-property-card';
import { SearchBar } from '../ui/search-bar';
import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';

/**
 * Landing pública (contenido estático de marketing, sin API).
 * Prerenderizada en build (ADR-004): no depende de sesión para pintar.
 */
@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    NgOptimizedImage,
    SiteHeader,
    SiteFooter,
    SearchBar,
    ExamplePropertyCard,
    UiIcon,
  ],
  templateUrl: './landing-page.html',
})
export class LandingPage {
  protected readonly listings = EXAMPLE_LISTINGS;
  protected readonly categories = CATEGORIES;
  protected readonly steps = STEPS;
  protected readonly testimonials = TESTIMONIALS;
  protected readonly trustItems = TRUST_ITEMS;
  protected readonly communityBenefits = COMMUNITY_BENEFITS;
}
