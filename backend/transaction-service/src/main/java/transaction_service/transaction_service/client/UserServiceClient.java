package transaction_service.transaction_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@FeignClient(name = "user-service", url = "${user.service.url:http://localhost:8082}")
public interface UserServiceClient {

    @GetMapping("/users/{id}")
    Map<String, Object> getUser(@PathVariable("id") Long id);

    @PutMapping("/users/{id}/balance")
    void updateBalance(@PathVariable("id") Long id, @RequestParam("amount") BigDecimal amount);
}
