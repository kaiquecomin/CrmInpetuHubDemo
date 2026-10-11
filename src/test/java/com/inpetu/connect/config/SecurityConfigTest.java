package com.inpetu.connect.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigTest {
    @Test
    void allowsLocalDemoHostsButRejectsUnconfiguredOrigins() {
        CorsConfigurationSource source = new SecurityConfig()
            .corsConfigurationSource("http://localhost:5173,http://127.0.0.1:5173");
        MockHttpServletRequest request = new MockHttpServletRequest();
        CorsConfiguration configuration = source.getCorsConfiguration(request);

        assertEquals("http://localhost:5173", configuration.checkOrigin("http://localhost:5173"));
        assertEquals("http://127.0.0.1:5173", configuration.checkOrigin("http://127.0.0.1:5173"));
        assertNull(configuration.checkOrigin("http://localhost:5174"));
        assertTrue(configuration.getAllowCredentials());
        assertNull(configuration.checkOrigin("*"));
    }
}
