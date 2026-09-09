import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminUploadsService } from './admin-uploads.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly service: AdminUploadsService) {}

  /** Devuelve los datos firmados para que el panel suba una foto de barbero
   * directo a Cloudinary (el archivo nunca pasa por el backend). */
  @Post('signature')
  createBarberPhotoSignature() {
    return this.service.createBarberPhotoSignature();
  }
}
