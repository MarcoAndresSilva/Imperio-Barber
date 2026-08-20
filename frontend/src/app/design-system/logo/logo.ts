import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Recreación aproximada en SVG del logo real (foto de un sticker físico, no
 * vectorial). Reemplazar por <img> con el archivo transparente real cuando
 * el cliente lo consiga — ver ARCHITECTURE.md, Paso 2.
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  variant = input<'wordmark' | 'badge'>('wordmark');
}
