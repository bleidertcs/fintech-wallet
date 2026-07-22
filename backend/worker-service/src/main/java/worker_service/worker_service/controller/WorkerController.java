package worker_service.worker_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import worker_service.worker_service.entity.AuditLog;
import worker_service.worker_service.entity.StatementJob;
import worker_service.worker_service.service.AuditService;
import worker_service.worker_service.service.StatementService;

import java.io.File;
import java.util.List;

@RestController
@RequestMapping("/worker")
@RequiredArgsConstructor
public class WorkerController {

    private final StatementService statementService;
    private final AuditService auditService;

    @PostMapping("/statements/request")
    public ResponseEntity<StatementJob> requestStatement(@RequestParam Long userId) {
        return ResponseEntity.ok(statementService.requestStatement(userId));
    }

    @GetMapping("/statements/{jobId}")
    public ResponseEntity<StatementJob> getStatementStatus(@PathVariable Long jobId) {
        return ResponseEntity.ok(statementService.getJob(jobId));
    }

    @GetMapping("/statements/user/{userId}")
    public ResponseEntity<List<StatementJob>> getStatementsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(statementService.getJobsByUser(userId));
    }

    @GetMapping("/statements/{jobId}/download")
    public ResponseEntity<Resource> downloadStatement(@PathVariable Long jobId) {
        StatementJob job = statementService.getJob(jobId);
        if (!"COMPLETED".equalsIgnoreCase(job.getStatus()) || job.getPdfPath() == null) {
            return ResponseEntity.badRequest().build();
        }

        File file = new File(job.getPdfPath());
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    @GetMapping("/audit/user/{userId}")
    public ResponseEntity<List<AuditLog>> getAuditLogsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditService.getAuditLogsForUser(userId));
    }
}
