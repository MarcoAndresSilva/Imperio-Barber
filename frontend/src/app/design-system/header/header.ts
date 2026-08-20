import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { Logo } from '../logo/logo';

const WHATSAPP_NUMBER = '56994620439';
const WHATSAPP_TEXT = 'Hola Imperio Barber, quiero agendar una hora';

@Component({
  selector: 'app-header',
  imports: [Logo],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly scrolled = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  protected readonly whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

  @HostListener('window:scroll')
  onWindowScroll() {
    this.scrolled.set(window.scrollY > 20);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
