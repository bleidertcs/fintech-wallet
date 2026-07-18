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

    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    @Transactional
    @WithSpan("transaction.transfer")
    public TransferResponse transfer(TransferRequest request) {
        UserResponse sender = userServiceStub.getUser(UserRequest.newBuilder().setId(request.getFromUserId()).build());
        userServiceStub.getUser(UserRequest.newBuilder().setId(request.getToUserId()).build());

        BigDecimal senderBalance = BigDecimal.valueOf(sender.getBalance());
        if (senderBalance.compareTo(request.getAmount()) < 0) {
            throw new RuntimeException("Saldo insuficiente");
        }

        // Check daily limit (0 or null = use default 50000)
        BigDecimal dailyLimit = new BigDecimal("50000");
        if (sender.getDailyLimit() > 0) {
            dailyLimit = BigDecimal.valueOf(sender.getDailyLimit());
        }

        BigDecimal todaySent = getDailyTotal(request.getFromUserId());
        if (todaySent.add(request.getAmount()).compareTo(dailyLimit) > 0) {
            throw new RuntimeException("Limite diario excedido. Limite: $" + dailyLimit
                    + ", Enviado hoy: $" + todaySent + ", Disponible: $" + dailyLimit.subtract(todaySent));
        }

        UpdateBalanceResponse senderBalRes = userServiceStub.updateBalance(UpdateBalanceRequest.newBuilder()
                .setId(request.getFromUserId())
                .setAmount(request.getAmount().negate().doubleValue())
                .build());
        if (!senderBalRes.getSuccess()) {
            throw new RuntimeException("Error actualizando saldo emisor: " + senderBalRes.getMessage());
        }

        UpdateBalanceResponse receiverBalRes = userServiceStub.updateBalance(UpdateBalanceRequest.newBuilder()
                .setId(request.getToUserId())
                .setAmount(request.getAmount().doubleValue())
                .build());
        if (!receiverBalRes.getSuccess()) {
            throw new RuntimeException("Error actualizando saldo receptor: " + receiverBalRes.getMessage());
        }

        Transaction tx = Transaction.builder()
                .fromUserId(request.getFromUserId())
                .toUserId(request.getToUserId())
                .amount(request.getAmount())
                .status("COMPLETED")
                .build();
        tx = transactionRepository.save(tx);

        // Kafka notification (best-effort)
        try {
            TransferCompletedEvent event = TransferCompletedEvent.builder()
                    .fromUser(request.getFromUserId())
                    .toUser(request.getToUserId())
                    .amount(request.getAmount())
                    .build();
            transactionProducer.sendTransferCompleted(event);
        } catch (Exception e) {
            log.warn("Kafka notification failed: {}", e.getMessage());
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
