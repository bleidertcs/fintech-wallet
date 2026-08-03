package transaction_service.transaction_service.config;

import net.devh.boot.grpc.client.channelfactory.GrpcChannelConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Configuration
public class GrpcRetryConfig {

    @Bean
    public GrpcChannelConfigurer grpcRetryChannelConfigurer() {
        return (channelBuilder, name) -> {
            channelBuilder.enableRetry();

            Map<String, Object> retryPolicy = new HashMap<>();
            retryPolicy.put("maxAttempts", 3.0);
            retryPolicy.put("initialBackoff", "0.2s");
            retryPolicy.put("maxBackoff", "1s");
            retryPolicy.put("backoffMultiplier", 1.5);
            retryPolicy.put("retryableStatusCodes", List.of("UNAVAILABLE", "DEADLINE_EXCEEDED"));

            Map<String, Object> methodConfig = new HashMap<>();
            methodConfig.put("name", List.of(Map.of()));
            methodConfig.put("retryPolicy", retryPolicy);
            methodConfig.put("waitForReady", true);

            Map<String, Object> serviceConfig = new HashMap<>();
            serviceConfig.put("methodConfig", List.of(methodConfig));

            channelBuilder.defaultServiceConfig(serviceConfig);
            channelBuilder.keepAliveTime(30, TimeUnit.SECONDS);
            channelBuilder.keepAliveTimeout(10, TimeUnit.SECONDS);
            channelBuilder.keepAliveWithoutCalls(true);
        };
    }
}
