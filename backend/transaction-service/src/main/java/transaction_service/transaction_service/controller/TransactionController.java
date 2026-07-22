package transaction_service.transaction_service.controller;

import transaction_service.transaction_service.dto.*;
import transaction_service.transaction_service.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<TransferResponse> transfer(@RequestBody TransferRequest request,
                                                     @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.ok(transactionService.transfer(request, idempotencyKey));
    }


    @GetMapping("/user/{userId}")
    public ResponseEntity<List<TransferResponse>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(transactionService.getTransactionsByUser(userId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<TransferResponse>> getAll() {
        return ResponseEntity.ok(transactionService.getAllTransactions());
    }

    // Money Requests
    @PostMapping("/request")
    public ResponseEntity<MoneyRequestDto> createRequest(@RequestBody MoneyRequestDto dto) {
        return ResponseEntity.ok(transactionService.createMoneyRequest(dto));
    }

    @GetMapping("/requests/{userId}")
    public ResponseEntity<List<MoneyRequestDto>> getRequests(@PathVariable Long userId) {
        return ResponseEntity.ok(transactionService.getRequestsByUser(userId));
    }

    @PutMapping("/requests/{id}/accept")
    public ResponseEntity<MoneyRequestDto> acceptRequest(@PathVariable Long id) {
        return ResponseEntity.ok(transactionService.acceptRequest(id));
    }

    @PutMapping("/requests/{id}/reject")
    public ResponseEntity<MoneyRequestDto> rejectRequest(@PathVariable Long id) {
        return ResponseEntity.ok(transactionService.rejectRequest(id));
    }
}
