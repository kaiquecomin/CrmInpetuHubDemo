package com.inpetu.connect.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationMs;
    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expirationMs = expirationMs;
    }
    public String gerar(UserDetails user) {
        return gerar(user, 0);
    }
    public String gerar(UserDetails user, int versaoToken) {
        Date now = new Date();
        return Jwts.builder().subject(user.getUsername()).claim("db", "main").claim("ver", versaoToken)
            .issuedAt(now).expiration(new Date(now.getTime() + expirationMs)).signWith(key).compact();
    }
    public String extrairEmail(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
    }
    public boolean valido(String token, UserDetails user) {
        return valido(token, user, 0);
    }
    public boolean valido(String token, UserDetails user, int versaoToken) {
        try {
            var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return "main".equals(claims.get("db", String.class))
                && claims.getSubject().equals(user.getUsername())
                && (claims.get("ver", Integer.class) == null ? 0 : claims.get("ver", Integer.class)) == versaoToken
                && claims.getExpiration().after(new Date());
        }
        catch (JwtException | IllegalArgumentException ex) { return false; }
    }

    public long expirationMs() {
        return expirationMs;
    }
}
