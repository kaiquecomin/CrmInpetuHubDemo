package com.inpetu.connect.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    private final JwtService jwt = mock(JwtService.class);
    private final UserDetailsService users = mock(UserDetailsService.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, users);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesFromHttpOnlyCookie() throws Exception {
        UserDetails principal = User.withUsername("person@example.test").password("unused").roles("STAFF").build();
        when(jwt.extrairEmail("cookie-token")).thenReturn(principal.getUsername());
        when(users.loadUserByUsername(principal.getUsername())).thenReturn(principal);
        when(jwt.valido("cookie-token", principal)).thenReturn(true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("inpetu-token", "cookie-token"));

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertEquals(principal.getUsername(),
            SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Test
    void retainsBearerHeaderAsTemporaryFallback() throws Exception {
        UserDetails principal = User.withUsername("person@example.test").password("unused").roles("STAFF").build();
        when(jwt.extrairEmail("bearer-token")).thenReturn(principal.getUsername());
        when(users.loadUserByUsername(principal.getUsername())).thenReturn(principal);
        when(jwt.valido("bearer-token", principal)).thenReturn(true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer bearer-token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertEquals(principal.getUsername(),
            SecurityContextHolder.getContext().getAuthentication().getName());
    }
}
