package transaction_service.transaction_service.repository;

import transaction_service.transaction_service.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByFromUserIdOrToUserId(Long fromUserId, Long toUserId);
}
