import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Header } from './design-system/header/header';
import { Footer } from './design-system/footer/footer';

const WHATSAPP_NUMBER = '56994620439';
const WHATSAPP_TEXT = 'Hola Imperio Barber, quiero agendar una hora';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);

  protected readonly whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

  // '/confirmar/:token' es una página enfocada (compartida por WhatsApp) — sin el header/footer
  // ni el botón flotante de la marketing, para que se vea como una tarjeta sola.
  protected readonly isStandalonePage = signal(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/confirmar'),
  );

  constructor() {
    // Anchors nativos (#servicios, #profesionales, etc.) fallan al entrar directo a la URL
    // con el hash puesto, porque esa sección de la landing carga async (loadComponent) y el
    // navegador intenta saltar antes de que el elemento exista en el DOM. Reintentamos el
    // scroll una vez que la navegación (y con ella el chunk lazy) terminó de resolver.
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;

      this.isStandalonePage.set(event.urlAfterRedirects.startsWith('/confirmar'));

      const hash = window.location.hash.slice(1);
      if (!hash) return;
      setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 150);
    });
  }
}
