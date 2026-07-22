package worker_service.worker_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import worker_service.worker_service.entity.StatementJob;
import worker_service.worker_service.repository.StatementJobRepository;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatementService {

    private final StatementJobRepository statementJobRepository;
    private final PdfGeneratorService pdfGeneratorService;

    public StatementJob requestStatement(Long userId) {
        StatementJob job = StatementJob.builder()
                .userId(userId)
                .status("PENDING")
                .build();
        job = statementJobRepository.save(job);
        
        processJobAsync(job.getId(), userId);
        
        return job;
    }

    @Async
    public void processJobAsync(Long jobId, Long userId) {
        StatementJob job = statementJobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        try {
            job.setStatus("IN_PROGRESS");
            statementJobRepository.save(job);

            File pdfFile = pdfGeneratorService.generateBankStatement(userId, jobId);

            job.setStatus("COMPLETED");
            job.setPdfPath(pdfFile.getAbsolutePath());
            job.setCompletedAt(LocalDateTime.now());
            statementJobRepository.save(job);
            log.info("Statement job ID {} completed successfully.", jobId);
        } catch (Exception e) {
            log.error("Statement job ID {} failed: {}", jobId, e.getMessage(), e);
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            statementJobRepository.save(job);
        }
    }

    public StatementJob getJob(Long jobId) {
        return statementJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Statement job not found: " + jobId));
    }

    public List<StatementJob> getJobsByUser(Long userId) {
        return statementJobRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
