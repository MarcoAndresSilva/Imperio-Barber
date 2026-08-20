import { ChangeDetectionStrategy, Component } from '@angular/core';

const WHATSAPP_NUMBER = '56994620439';
const WHATSAPP_TEXT = 'Hola Imperio Barber, quiero agendar una hora';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  protected readonly whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
}
