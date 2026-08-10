import { Injectable, Logger } from '@nestjs/common';
import { PdfGeneratorPort } from '../../../domain/ports/pdf-generator.port';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfKitAdapter implements PdfGeneratorPort {
  private readonly logger = new Logger(PdfKitAdapter.name);

  async generateStatementPdf(jobId: number, userId: number): Promise<string> {
    const dirPath = process.env.STATEMENTS_DIR || '/tmp/statements';
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const fileName = `statement_job_${jobId}.pdf`;
    const filePath = path.join(dirPath, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // Header
        doc
          .fillColor('#0d9488')
          .fontSize(24)
          .text('FINTECH WALLET', { align: 'center' })
          .moveDown(0.5);

        doc
          .fillColor('#333333')
          .fontSize(16)
          .text('EXTRACTO BANCARIO OFICIAL', { align: 'center' })
          .moveDown(1.5);

        // Details
        doc
          .fontSize(12)
          .text(`ID de Trabajo: ${jobId}`)
          .text(`ID de Usuario: ${userId}`)
          .text(`Fecha de Emisión: ${new Date().toLocaleString()}`)
          .moveDown(1);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#cccccc').moveDown(1);

        // Table Header
        doc
          .fontSize(12)
          .fillColor('#0f766e')
          .text('Resumen de Cuenta', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(10)
          .fillColor('#444444')
          .text('Moneda Principal: USD')
          .text('Estado del Extracto: COMPLETO Y VERIFICADO')
          .text('Servicio Emisor: Worker Service (NestJS)')
          .moveDown(2);

        // Footer
        doc
          .fontSize(9)
          .fillColor('#888888')
          .text('Este documento es un comprobante digital generado automáticamente por FinTech Wallet System.', 50, 700, {
            align: 'center',
          });

        doc.end();

        writeStream.on('finish', () => {
          this.logger.log(`PDF generado correctamente en: ${filePath}`);
          resolve(filePath);
        });

        writeStream.on('error', (err) => {
          this.logger.error(`Error en WriteStream de PDF: ${err.message}`, err.stack);
          reject(err);
        });
      } catch (error) {
        this.logger.error(`Error al construir documento PDFKit: ${error.message}`, error.stack);
        reject(error);
      }
    });
  }
}
