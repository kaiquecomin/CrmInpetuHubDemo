package com.inpetu.connect.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {
    private static final String SECRET = "test-only-jwt-secret-with-more-than-32-bytes";

    @Test
    void acceptsTokensIssuedForTheSingleMainDatabase() {
        JwtService service = new JwtService(SECRET, 3_600_000);
        UserDetails user = User.withUsername("person@example.test").password("unused").roles("STAFF").build();

        assertTrue(service.valido(service.gerar(user), user));
    }

    @Test
    void rejectsTokensIssuedForTheRemovedTestDatabase() {
        JwtService service = new JwtService(SECRET, 3_600_000);
        UserDetails user = User.withUsername("person@example.test").password("unused").roles("STAFF").build();
        Date now = new Date();
        String token = Jwts.builder()
            .subject(user.getUsername())
            .claim("db", "test")
            .issuedAt(now)
            .expiration(new Date(now.getTime() + 3_600_000))
            .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
            .compact();

        assertFalse(service.valido(token, user));
    }
}
