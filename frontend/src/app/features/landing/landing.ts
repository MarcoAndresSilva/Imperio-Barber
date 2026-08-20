import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Hero } from './hero/hero';
import { Servicios } from './servicios/servicios';
import { Nosotros } from './nosotros/nosotros';
import { Info } from './info/info';

@Component({
  selector: 'app-landing',
  imports: [Hero, Servicios, Nosotros, Info],
  template: `
    <app-hero />
    <app-servicios />
    <app-nosotros />
    <app-info />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {}
