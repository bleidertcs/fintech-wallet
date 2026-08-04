package transaction_service.transaction_service.saga;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import transaction_service.transaction_service.dto.TransferRequest;
import transaction_service.transaction_service.entity.SagaInstance;
import transaction_service.transaction_service.entity.Transaction;
import transaction_service.transaction_service.kafka.event.TransferCompletedEvent;
import transaction_service.transaction_service.repository.SagaInstanceRepository;
import transaction_service.transaction_service.repository.TransactionRepository;
import transaction_service.transaction_service.service.OutboxService;
import user_service.grpc.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TransferSagaOrchestrator {

    private final SagaInstanceRepository sagaInstanceRepository;
    private final TransactionRepository transactionRepository;
    private final OutboxService outboxService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    @Transactional
    public Transaction executeTransferSaga(TransferRequest request, BigDecimal senderDailyTotal) {
        String sagaId = UUID.randomUUID().toString();
        log.info("Starting Transfer Saga ID: {} [From User: {}, To User: {}, Amount: {}]",
                sagaId, request.getFromUserId(), request.getToUserId(), request.getAmount());

        // 1. Validation phase
        UserResponse sender = userServiceStub.getUser(UserRequest.newBuilder().setId(request.getFromUserId()).build());
        userServiceStub.getUser(UserRequest.newBuilder().setId(request.getToUserId()).build());

        BigDecimal senderBalance = BigDecimal.valueOf(sender.getBalance());
        if (senderBalance.compareTo(request.getAmount()) < 0) {
            throw new RuntimeException("Saldo insuficiente");
        }

        BigDecimal dailyLimit = new BigDecimal("50000");
        if (sender.getDailyLimit() > 0) {
            dailyLimit = BigDecimal.valueOf(sender.getDailyLimit());
        }

        if (senderDailyTotal.add(request.getAmount()).compareTo(dailyLimit) > 0) {
            throw new RuntimeException("Limite diario excedido. Limite: $" + dailyLimit
                    + ", Enviado hoy: $" + senderDailyTotal + ", Disponible: $" + dailyLimit.subtract(senderDailyTotal));
        }

        // 2. Persist initial Saga State
        SagaInstance saga = SagaInstance.builder()
                .id(sagaId)
                .sagaType("TRANSFER_MONEY")
                .currentStep("DEBIT_SENDER")
                .status("STARTED")
                .payload(serializePayload(request))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        saga = sagaInstanceRepository.save(saga);

        // 3. Step 1: Debit Sender Balance
        log.info("Saga ID {}: Executing Step 1 - Debit Sender {}", sagaId, request.getFromUserId());
        UpdateBalanceResponse debitResponse = userServiceStub.updateBalance(UpdateBalanceRequest.newBuilder()
                .setId(request.getFromUserId())
                .setAmount(request.getAmount().negate().doubleValue())
                .build());

        if (!debitResponse.getSuccess()) {
            saga.setStatus("FAILED");
            saga.setErrorMessage("Fallo al debitar emisor: " + debitResponse.getMessage());
            sagaInstanceRepository.save(saga);
            throw new RuntimeException("Error en Saga (Débito emisor): " + debitResponse.getMessage());
        }

        saga.setCurrentStep("CREDIT_RECEIVER");
        saga.setStatus("DEBIT_COMPLETED");
        sagaInstanceRepository.save(saga);

        // 4. Step 2: Credit Receiver Balance
        try {
            log.info("Saga ID {}: Executing Step 2 - Credit Receiver {}", sagaId, request.getToUserId());
            UpdateBalanceResponse creditResponse = userServiceStub.updateBalance(UpdateBalanceRequest.newBuilder()
                    .setId(request.getToUserId())
                    .setAmount(request.getAmount().doubleValue())
                    .build());

            if (!creditResponse.getSuccess()) {
                throw new RuntimeException("Fallo al acreditar receptor: " + creditResponse.getMessage());
            }
        } catch (Exception e) {
            log.error("Saga ID {}: Step 2 (Credit) failed. Triggering Compensating Transaction!", sagaId, e);
            saga.setStatus("COMPENSATING");
            saga.setErrorMessage("Fallo en crédito de receptor: " + e.getMessage());
            sagaInstanceRepository.save(saga);

            // COMPENSATING ACTION: Refund Sender
            try {
                log.info("Saga ID {}: Executing Compensating Action - Refund Sender {}", sagaId, request.getFromUserId());
                UpdateBalanceResponse refundResponse = userServiceStub.updateBalance(UpdateBalanceRequest.newBuilder()
                        .setId(request.getFromUserId())
                        .setAmount(request.getAmount().doubleValue()) // Refund original amount
                        .build());

                if (refundResponse.getSuccess()) {
                    saga.setStatus("COMPENSATED");
                    saga.setErrorMessage(saga.getErrorMessage() + " | Reembolso compensatorio completado con éxito.");
                } else {
                    saga.setStatus("FAILED");
                    saga.setErrorMessage(saga.getErrorMessage() + " | FALLO CRÍTICO en acción compensatoria: " + refundResponse.getMessage());
                }
            } catch (Exception refundEx) {
                saga.setStatus("FAILED");
                saga.setErrorMessage(saga.getErrorMessage() + " | FALLO CRÍTICO en acción compensatoria: " + refundEx.getMessage());
            }

            sagaInstanceRepository.save(saga);
            throw new RuntimeException("La transferencia falló durante la acreditación. Se ejecutó transacción compensatoria para devolver los fondos al emisor.");
        }

        // 5. Complete Saga & Record Transaction + Transactional Outbox Event
        Transaction tx = Transaction.builder()
                .fromUserId(request.getFromUserId())
                .toUserId(request.getToUserId())
                .amount(request.getAmount())
                .status("COMPLETED")
                .build();
        tx = transactionRepository.save(tx);

        TransferCompletedEvent event = TransferCompletedEvent.builder()
                .fromUser(request.getFromUserId())
                .toUser(request.getToUserId())
                .amount(request.getAmount())
                .build();

        outboxService.publishEvent("Transaction", tx.getId().toString(), "TRANSFER_COMPLETED", event);

        saga.setCurrentStep("COMPLETED");
        saga.setStatus("COMPLETED");
        sagaInstanceRepository.save(saga);

        log.info("Saga ID {} completed successfully. Transaction ID: {}", sagaId, tx.getId());
        return tx;
    }

    private String serializePayload(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
