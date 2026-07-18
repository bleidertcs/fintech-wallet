package api_gateway.api_gateway.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.instrumentation.annotations.WithSpan;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.Base64;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final SecretKey key;
    private final List<String> openPaths = List.of("/auth/register", "/auth/login", "/auth/verify-email", "/auth/verify-totp");

    public JwtAuthFilter(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
    }

    @Override
    @WithSpan("gateway.jwt_auth")
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        Span.current().setAttribute("gateway.path", path);

        if (openPaths.stream().anyMatch(path::startsWith)) {
            Span.current().setAttribute("gateway.auth.result", "skipped");
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            Span.current().setAttribute("gateway.auth.result", "missing_header");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"Missing or invalid Authorization header\"}");
            return;
        }

        String token = authHeader.substring(7);
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            Span.current().setAttribute("gateway.auth.result", "success");
        } catch (JwtException e) {
            Span.current().setAttribute("gateway.auth.result", "invalid_token");
            Span.current().recordException(e);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"Invalid or expired token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
