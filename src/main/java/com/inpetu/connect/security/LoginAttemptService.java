package com.inpetu.connect.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {
    private final int maxAttempts;
    private final Duration lockDuration;
    private final Map<String, AttemptState> ipAttempts = new ConcurrentHashMap<>();
    private final Map<String, AttemptState> accountAttempts = new ConcurrentHashMap<>();

    public LoginAttemptService(@Value("${app.security.login.max-attempts:5}") int maxAttempts,
                               @Value("${app.security.login.lock-duration-seconds:900}") long lockDurationSeconds) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.lockDuration = Duration.ofSeconds(Math.max(1, lockDurationSeconds));
    }

    public AttemptStatus check(String ipAddress, String email) {
        AttemptStatus ipStatus = check(ipAttempts, normalize(ipAddress));
        AttemptStatus accountStatus = check(accountAttempts, normalizeEmail(email));
        if (!ipStatus.blocked()) return accountStatus;
        if (!accountStatus.blocked()) return ipStatus;
        return new AttemptStatus(true, Math.max(ipStatus.remainingSeconds(), accountStatus.remainingSeconds()));
    }

    public AttemptStatus check(String ipAddress) {
        return check(ipAddress, null);
    }

    public void recordFailure(String ipAddress, String email) {
        recordFailure(ipAttempts, normalize(ipAddress));
        recordFailure(accountAttempts, normalizeEmail(email));
    }

    public void recordFailure(String ipAddress) {
        recordFailure(ipAddress, null);
    }

    public void recordSuccess(String ipAddress, String email) {
        remove(ipAttempts, normalize(ipAddress));
        remove(accountAttempts, normalizeEmail(email));
    }

    public void recordSuccess(String ipAddress) {
        recordSuccess(ipAddress, null);
    }

    public record AttemptStatus(boolean blocked, long remainingSeconds) {
        public static AttemptStatus empty() {
            return new AttemptStatus(false, 0L);
        }
    }

    private AttemptStatus check(Map<String, AttemptState> attempts, String key) {
        if (key == null) return AttemptStatus.empty();
        AttemptState state = attempts.get(key);
        if (state == null || state.lockedUntil() == null) return AttemptStatus.empty();
        Instant now = Instant.now();
        if (state.lockedUntil().isAfter(now)) {
            long remainingSeconds = Math.max(1, Duration.between(now, state.lockedUntil()).getSeconds());
            return new AttemptStatus(true, remainingSeconds);
        }
        attempts.remove(key, state);
        return AttemptStatus.empty();
    }

    private void recordFailure(Map<String, AttemptState> attempts, String key) {
        if (key == null) return;
        attempts.compute(key, (ignored, current) -> {
            int failedAttempts = current == null ? 1 : current.failedAttempts() + 1;
            Instant lockedUntil = failedAttempts >= maxAttempts ? Instant.now().plus(lockDuration) : null;
            return new AttemptState(failedAttempts, lockedUntil);
        });
    }

    private void remove(Map<String, AttemptState> attempts, String key) {
        if (key != null) attempts.remove(key);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static String normalizeEmail(String email) {
        String normalized = normalize(email);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private record AttemptState(int failedAttempts, Instant lockedUntil) {
    }
}
