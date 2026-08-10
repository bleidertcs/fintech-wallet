import { Module } from '@nestjs/common';
import { PdfKitAdapter } from './pdfkit.adapter';
import { PDF_GENERATOR_PORT } from '../../../domain/ports/pdf-generator.port';

@Module({
  providers: [
    {
      provide: PDF_GENERATOR_PORT,
      useClass: PdfKitAdapter,
    },
  ],
  exports: [PDF_GENERATOR_PORT],
})
export class PdfModule {}
