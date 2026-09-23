import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExampleListing } from '../marketing-content';

/** Tarjeta de ejemplo de la landing (sin precios: el marketing no usa cifras reales). */
@Component({
  selector: 'app-example-property-card',
  imports: [RouterLink],
  templateUrl: './example-property-card.html',
})
export class ExamplePropertyCard {
  readonly listing = input.required<ExampleListing>();
}
