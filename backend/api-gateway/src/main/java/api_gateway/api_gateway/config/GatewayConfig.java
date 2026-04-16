package api_gateway.api_gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RequestPredicates;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

@Configuration
public class GatewayConfig {

    @Value("${auth.service.url:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${user.service.url:http://localhost:8082}")
    private String userServiceUrl;

    @Value("${transaction.service.url:http://localhost:8083}")
    private String transactionServiceUrl;

    @Bean
    public RouterFunction<ServerResponse> authRoute() {
        return GatewayRouterFunctions.route("auth-service")
                .route(RequestPredicates.path("/auth/**"), HandlerFunctions.http())
                .before(BeforeFilterFunctions.uri(authServiceUrl))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> userRoute() {
        return GatewayRouterFunctions.route("user-service")
                .route(RequestPredicates.path("/users/**"), HandlerFunctions.http())
                .before(BeforeFilterFunctions.uri(userServiceUrl))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> transactionRoute() {
        return GatewayRouterFunctions.route("transaction-service")
                .route(RequestPredicates.path("/transactions/**"), HandlerFunctions.http())
                .before(BeforeFilterFunctions.uri(transactionServiceUrl))
                .build();
    }
}
