package transaction_service.transaction_service.service;

import transaction_service.transaction_service.dto.*;
import transaction_service.transaction_service.entity.MoneyRequest;
import transaction_service.transaction_service.entity.Transaction;
import transaction_service.transaction_service.kafka.event.TransferCompletedEvent;
import transaction_service.transaction_service.kafka.producer.TransactionProducer;
import transaction_service.transaction_service.repository.MoneyRequestRepository;
import transaction_service.transaction_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import net.devh.boot.grpc.client.inject.GrpcClient;
import user_service.grpc.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final MoneyRequestRepository moneyRequestRepository;
    private final TransactionProducer transactionProducer;
    private final IdempotencyService idempotencyService;
    private final transaction_service.transaction_service.saga.TransferSagaOrchestrator transferSagaOrchestrator;

    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    public TransferResponse transfer(TransferRequest request) {
        return transfer(request, null);
    }

    @Transactional
    @WithSpan("transaction.transfer")
    public TransferResponse transfer(TransferRequest request, String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            if (idempotencyService.isDuplicateKey(idempotencyKey)) {
                throw new RuntimeException("Transacción duplicada: la clave de idempotencia ya fue procesada");
            }
        }

        BigDecimal todaySent = getDailyTotal(request.getFromUserId());
        Transaction tx = transferSagaOrchestrator.executeTransferSaga(request, todaySent);

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyService.registerKey(idempotencyKey, 24);
        }

        return toTransferResponse(tx);
    }

    @WithSpan("transaction.getTransactionsByUser")
    public List<TransferResponse> getTransactionsByUser(Long userId) {
        return transactionRepository.findByFromUserIdOrToUserId(userId, userId)
                .stream().map(this::toTransferResponse).toList();
    }

    public List<TransferResponse> getAllTransactions() {
        return transactionRepository.findAll()
                .stream().map(this::toTransferResponse).toList();
    }

    private BigDecimal getDailyTotal(Long userId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        return transactionRepository.findByFromUserIdOrToUserId(userId, userId).stream()
                .filter(tx -> tx.getFromUserId().equals(userId))
                .filter(tx -> tx.getCreatedAt() != null && tx.getCreatedAt().isAfter(startOfDay))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ===== Money Requests =====

    @WithSpan("transaction.createMoneyRequest")
    public MoneyRequestDto createMoneyRequest(MoneyRequestDto dto) {
        MoneyRequest req = MoneyRequest.builder()
                .requesterId(dto.getRequesterId())
                .targetId(dto.getTargetId())
                .amount(dto.getAmount())
                .message(dto.getMessage())
                .status("PENDING")
                .build();
        req = moneyRequestRepository.save(req);
        return toMoneyRequestDto(req);
    }

    public List<MoneyRequestDto> getRequestsByUser(Long userId) {
        return moneyRequestRepository.findByRequesterIdOrTargetId(userId, userId)
                .stream().map(this::toMoneyRequestDto).toList();
    }

    @Transactional
    @WithSpan("transaction.acceptRequest")
    public MoneyRequestDto acceptRequest(Long requestId) {
        MoneyRequest req = moneyRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!"PENDING".equals(req.getStatus())) {
            throw new RuntimeException("Request already processed");
        }

        // Execute the transfer (target pays the requester)
        TransferRequest transferReq = new TransferRequest();
        transferReq.setFromUserId(req.getTargetId());
        transferReq.setToUserId(req.getRequesterId());
        transferReq.setAmount(req.getAmount());
        transfer(transferReq);

        req.setStatus("ACCEPTED");
        moneyRequestRepository.save(req);
        return toMoneyRequestDto(req);
    }

    @WithSpan("transaction.rejectRequest")
    public MoneyRequestDto rejectRequest(Long requestId) {
        MoneyRequest req = moneyRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!"PENDING".equals(req.getStatus())) {
            throw new RuntimeException("Request already processed");
        }

        req.setStatus("REJECTED");
        moneyRequestRepository.save(req);
        return toMoneyRequestDto(req);
    }

    private TransferResponse toTransferResponse(Transaction tx) {
        return TransferResponse.builder()
                .transactionId(tx.getId())
                .fromUserId(tx.getFromUserId())
                .toUserId(tx.getToUserId())
                .amount(tx.getAmount())
                .status(tx.getStatus())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    private MoneyRequestDto toMoneyRequestDto(MoneyRequest req) {
        return MoneyRequestDto.builder()
                .id(req.getId())
                .requesterId(req.getRequesterId())
                .targetId(req.getTargetId())
                .amount(req.getAmount())
                .message(req.getMessage())
                .status(req.getStatus())
                .createdAt(req.getCreatedAt())
                .build();
    }
}
