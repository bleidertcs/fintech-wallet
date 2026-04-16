package transaction_service.transaction_service.kafka.producer;

import transaction_service.transaction_service.kafka.event.TransferCompletedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TransactionProducer {

    private final KafkaTemplate<String, TransferCompletedEvent> kafkaTemplate;

    public void sendTransferCompleted(TransferCompletedEvent event) {
        kafkaTemplate.send("transfer_completed", event);
    }
}
