package com.inpetu.connect.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LocalDemoDatabaseGuardTest {
    @Test
    void allowsOnlyLocalMySqlHosts() {
        assertDoesNotThrow(() -> LocalDemoDatabaseGuard.requireLocalMySql("jdbc:mysql://localhost:3306/inpetu_connect"));
        assertDoesNotThrow(() -> LocalDemoDatabaseGuard.requireLocalMySql("jdbc:mysql://127.0.0.1:3306/inpetu_connect"));
        assertDoesNotThrow(() -> LocalDemoDatabaseGuard.requireLocalMySql("jdbc:mysql://[::1]:3306/inpetu_connect"));
        assertThrows(IllegalStateException.class, () -> LocalDemoDatabaseGuard.requireLocalMySql("jdbc:mysql://database.example:3306/inpetu_connect"));
        assertThrows(IllegalStateException.class, () -> LocalDemoDatabaseGuard.requireLocalMySql("jdbc:postgresql://localhost:5432/inpetu_connect"));
    }
}
