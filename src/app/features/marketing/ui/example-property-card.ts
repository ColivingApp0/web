import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExampleListing } from '../marketing-content';

/** Tarjeta ilustrativa de la landing, alineada al modelo mensual. */
@Component({
  selector: 'app-example-property-card',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './example-property-card.html',
})
export class ExamplePropertyCard {
  readonly listing = input.required<ExampleListing>();
}
