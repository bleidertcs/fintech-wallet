package worker_service.worker_service.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.awt.Color;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class PdfGeneratorService {

    public File generateBankStatement(Long userId, Long jobId) {
        try {
            File dir = new File("/tmp/statements");
            if (!dir.exists()) {
                dir.mkdirs();
            }
            File pdfFile = new File(dir, "statement_user_" + userId + "_job_" + jobId + ".pdf");
            
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, new FileOutputStream(pdfFile));
            document.open();

            // Colors
            Color primaryColor = new Color(24, 43, 73);
            Color accentColor = new Color(0, 150, 136);

            // Title Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, primaryColor);
            Paragraph title = new Paragraph("FinTech Wallet - Extracto Bancario", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            // Meta Info Table
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.DARK_GRAY);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.BLACK);

            metaTable.addCell(createCell("ID de Trabajo:", labelFont, false));
            metaTable.addCell(createCell(String.valueOf(jobId), valueFont, false));
            metaTable.addCell(createCell("ID de Usuario:", labelFont, false));
            metaTable.addCell(createCell(String.valueOf(userId), valueFont, false));
            metaTable.addCell(createCell("Fecha de Emisión:", labelFont, false));
            metaTable.addCell(createCell(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), valueFont, false));
            metaTable.addCell(createCell("Estado:", labelFont, false));
            metaTable.addCell(createCell("OFICIAL / VERIFICADO", valueFont, false));
            metaTable.setSpacingAfter(20);
            document.add(metaTable);

            // Summary Box
            Font boxHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, accentColor);
            Paragraph boxHeader = new Paragraph("Resumen de Cuenta", boxHeaderFont);
            boxHeader.setSpacingAfter(10);
            document.add(boxHeader);

            PdfPTable summaryTable = new PdfPTable(3);
            summaryTable.setWidthPercentage(100);

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);

            PdfPCell h1 = new PdfPCell(new Phrase("Concepto", headerFont));
            h1.setBackgroundColor(primaryColor);
            h1.setPadding(8);
            
            PdfPCell h2 = new PdfPCell(new Phrase("Moneda", headerFont));
            h2.setBackgroundColor(primaryColor);
            h2.setPadding(8);

            PdfPCell h3 = new PdfPCell(new Phrase("Estado Operativo", headerFont));
            h3.setBackgroundColor(primaryColor);
            h3.setPadding(8);

            summaryTable.addCell(h1);
            summaryTable.addCell(h2);
            summaryTable.addCell(h3);

            summaryTable.addCell(createCell("Movimientos del Período", valueFont, true));
            summaryTable.addCell(createCell("ARS", valueFont, true));
            summaryTable.addCell(createCell("AL DÍA", valueFont, true));

            document.add(summaryTable);

            // Footer
            Paragraph footer = new Paragraph("\nDocumento generado automáticamente por FinTech Wallet Worker Service.\nGracias por confiar en nuestros servicios.", FontFactory.getFont(FontFactory.HELVETICA, 9, Font.ITALIC, Color.GRAY));
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(30);
            document.add(footer);


            document.close();
            log.info("Bank statement PDF created successfully at: {}", pdfFile.getAbsolutePath());
            return pdfFile;
        } catch (Exception e) {
            log.error("Error generating PDF statement: {}", e.getMessage(), e);
            throw new RuntimeException("Error generating PDF statement", e);
        }
    }

    private PdfPCell createCell(String text, Font font, boolean border) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6);
        if (!border) {
            cell.setBorder(Rectangle.NO_BORDER);
        }
        return cell;
    }
}
