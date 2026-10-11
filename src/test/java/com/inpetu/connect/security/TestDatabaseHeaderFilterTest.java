package com.inpetu.connect.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockFilterChain;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TestDatabaseHeaderFilterTest {
    private final TestDatabaseHeaderFilter filter = new TestDatabaseHeaderFilter();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deniesTestDatabaseHeaderToSolicitante() throws Exception {
        authenticateAs("ROLE_SOLICITANTE");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Database", "test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void permitsTestDatabaseHeaderForCoordinator() throws Exception {
        authenticateAs("ROLE_COORDENADOR");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Database", "test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    private void authenticateAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("user@example.test", "unused",
                List.of(new SimpleGrantedAuthority(role))));
    }
}
