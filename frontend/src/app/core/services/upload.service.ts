import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Sube una foto de barbero directo a Cloudinary. El backend solo firma la subida
 * (`POST /admin/uploads/signature`, protegido); el archivo nunca pasa por el backend.
 * Devuelve la URL pública (`secure_url`) para guardarla como `photoUrl` del barbero. */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  uploadBarberPhoto(file: File): Observable<string> {
    if (!file.type.startsWith('image/')) {
      return throwError(() => new Error('El archivo debe ser una imagen.'));
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return throwError(() => new Error('La imagen no puede pesar más de 5 MB.'));
    }

    return this.http
      .post<UploadSignature>(`${environment.apiUrl}/admin/uploads/signature`, {})
      .pipe(
        switchMap((sig) => {
          const form = new FormData();
          form.append('file', file);
          form.append('api_key', sig.apiKey);
          form.append('timestamp', String(sig.timestamp));
          form.append('folder', sig.folder);
          form.append('signature', sig.signature);

          return this.http.post<CloudinaryUploadResponse>(
            `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
            form,
          );
        }),
        map((res) => res.secure_url),
      );
  }
}
