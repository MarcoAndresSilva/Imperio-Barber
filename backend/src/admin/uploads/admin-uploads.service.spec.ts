import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdminUploadsService, signParams } from './admin-uploads.service';

describe('AdminUploadsService', () => {
  let service: AdminUploadsService;

  const CONFIG: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'imperio',
    CLOUDINARY_API_KEY: '123456789012345',
    CLOUDINARY_API_SECRET: 'super-secreto',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminUploadsService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => CONFIG[key] },
        },
      ],
    }).compile();

    service = moduleRef.get(AdminUploadsService);
  });

  it('signParams: firma determinística con claves ordenadas + api_secret', () => {
    const expected = createHash('sha1')
      .update('folder=x&timestamp=1000' + 'super-secreto')
      .digest('hex');

    expect(signParams({ timestamp: 1000, folder: 'x' }, 'super-secreto')).toBe(
      expected,
    );
  });

  it('createBarberPhotoSignature: devuelve cloudName/apiKey/folder y una firma válida', () => {
    const sig = service.createBarberPhotoSignature();

    expect(sig.cloudName).toBe('imperio');
    expect(sig.apiKey).toBe('123456789012345');
    expect(sig.folder).toBe('imperio-barber/barbers');
    expect(sig.timestamp).toBeGreaterThan(0);
    expect(sig.signature).toBe(
      signParams(
        { folder: sig.folder, timestamp: sig.timestamp },
        'super-secreto',
      ),
    );
  });
});
