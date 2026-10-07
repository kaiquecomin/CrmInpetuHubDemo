package com.inpetu.connect.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {
    private final int maxAttempts;
    private final Duration lockDuration;
    private final Map<String, AttemptState> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(@Value("${app.security.login.max-attempts:5}") int maxAttempts,
                              @Value("${app.security.login.lock-duration-seconds:900}") long lockDurationSeconds) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.lockDuration = Duration.ofSeconds(Math.max(1, lockDurationSeconds));
    }

    public AttemptStatus check(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return AttemptStatus.empty();
        }
        AttemptState state = attempts.get(ipAddress);
        if (state == null || state.lockedUntil() == null) {
            return AttemptStatus.empty();
        }
        if (state.lockedUntil().isAfter(Instant.now())) {
            long remainingSeconds = Math.max(1, Duration.between(Instant.now(), state.lockedUntil()).getSeconds());
            return new AttemptStatus(true, remainingSeconds);
        }
        attempts.remove(ipAddress);
        return AttemptStatus.empty();
    }

    public void recordFailure(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return;
        }
        AttemptState current = attempts.getOrDefault(ipAddress, new AttemptState(0, null));
        int nextFailCount = current.failedAttempts() + 1;
        if (nextFailCount >= maxAttempts) {
            attempts.put(ipAddress, new AttemptState(nextFailCount, Instant.now().plus(lockDuration)));
            return;
        }
        attempts.put(ipAddress, new AttemptState(nextFailCount, null));
    }

    public void recordSuccess(String ipAddress) {
        if (ipAddress != null && !ipAddress.isBlank()) {
            attempts.remove(ipAddress);
        }
    }

    public record AttemptStatus(boolean blocked, long remainingSeconds) {
        public static AttemptStatus empty() {
            return new AttemptStatus(false, 0L);
        }
    }

    private record AttemptState(int failedAttempts, Instant lockedUntil) {
    }
}
