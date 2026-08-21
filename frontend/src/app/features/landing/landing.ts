import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Hero } from './hero/hero';
import { Servicios } from './servicios/servicios';
import { Professionals } from '../professionals/professionals';
import { Nosotros } from './nosotros/nosotros';
import { Info } from './info/info';

@Component({
  selector: 'app-landing',
  imports: [Hero, Servicios, Professionals, Nosotros, Info],
  template: `
    <app-hero />
    <app-servicios />
    <app-professionals />
    <app-nosotros />
    <app-info />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {}
