package api_gateway.api_gateway.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.HandlerFilterFunction;
import org.springframework.web.servlet.function.ServerResponse;

@Configuration
@Slf4j
public class RetryProxyConfig {

    @Bean
    public HandlerFilterFunction<ServerResponse, ServerResponse> gatewayRetryFilter() {
        return (request, next) -> {
            try {
                return next.handle(request);
            } catch (Exception e) {
                log.warn("Gateway route request to [{}] failed: {}. Retrying once...", request.path(), e.getMessage());
                try {
                    Thread.sleep(150);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
                try {
                    return next.handle(request);
                } catch (Exception retryEx) {
                    log.error("Gateway retry for [{}] failed: {}", request.path(), retryEx.getMessage());
                    throw retryEx;
                }
            }
        };
    }
}
