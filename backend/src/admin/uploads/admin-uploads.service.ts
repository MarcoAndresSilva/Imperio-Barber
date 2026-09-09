import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Carpeta fija en Cloudinary donde caen las fotos de barberos subidas desde el panel. */
const BARBERS_FOLDER = 'imperio-barber/barbers';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Firma subidas a Cloudinary sin que el archivo pase por el backend: el navegador
 * sube directo a Cloudinary con estos datos. La firma es
 * `sha1(<params ordenados como k=v unidos por &> + api_secret)` en hex — el formato
 * que exige Cloudinary. Se usa `crypto` nativo, sin SDK (cero dependencias nuevas).
 */
@Injectable()
export class AdminUploadsService {
  constructor(private readonly config: ConfigService) {}

  createBarberPhotoSignature(): UploadSignature {
    const cloudName = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.getOrThrow<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.getOrThrow<string>('CLOUDINARY_API_SECRET');

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = BARBERS_FOLDER;

    const signature = signParams({ folder, timestamp }, apiSecret);

    return { cloudName, apiKey, timestamp, folder, signature };
  }
}

/** `sha1(k1=v1&k2=v2&... + api_secret)` con las claves ordenadas alfabéticamente. */
export function signParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
}
