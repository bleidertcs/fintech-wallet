export const PDF_GENERATOR_PORT = Symbol('PDF_GENERATOR_PORT');

export interface PdfGeneratorPort {
  generateStatementPdf(jobId: number, userId: number): Promise<string>;
}
