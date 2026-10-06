package com.inpetu.connect.security;

import io.jsonwebtoken.*;
import com.inpetu.connect.db.DbContext;
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
        Date now = new Date();
        return Jwts.builder().subject(user.getUsername()).claim("db", DbContext.get()).issuedAt(now).expiration(new Date(now.getTime() + expirationMs)).signWith(key).compact();
    }
    public String extrairEmail(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
    }
    /** Banco em que o token foi emitido; tokens antigos, sem a claim, valem para o principal. */
    public String extrairBanco(String token) {
        String db = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().get("db", String.class);
        return DbContext.normalizar(db);
    }
    public boolean valido(String token, UserDetails user) {
        try { return extrairEmail(token).equals(user.getUsername()) && Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getExpiration().after(new Date()); }
        catch (JwtException | IllegalArgumentException ex) { return false; }
    }
}
