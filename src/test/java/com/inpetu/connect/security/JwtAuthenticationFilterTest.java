package com.inpetu.connect.security;

import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.UsuarioRepository;
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
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, users, usuarios);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesFromHttpOnlyCookie() throws Exception {
        UserDetails principal = User.withUsername("person@example.test").password("unused").roles("STAFF").build();
        Usuario usuario = new Usuario();
        usuario.setEmail(principal.getUsername());
        usuario.setVersaoToken(0);
        when(jwt.extrairEmail("cookie-token")).thenReturn(principal.getUsername());
        when(users.loadUserByUsername(principal.getUsername())).thenReturn(principal);
        when(usuarios.findByEmailIgnoreCase(principal.getUsername())).thenReturn(java.util.Optional.of(usuario));
        when(jwt.valido("cookie-token", principal, 0)).thenReturn(true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("inpetu-token", "cookie-token"));

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertEquals(principal.getUsername(),
            SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Test
    void retainsBearerHeaderAsTemporaryFallback() throws Exception {
        UserDetails principal = User.withUsername("person@example.test").password("unused").roles("STAFF").build();
        Usuario usuario = new Usuario();
        usuario.setEmail(principal.getUsername());
        usuario.setVersaoToken(0);
        when(jwt.extrairEmail("bearer-token")).thenReturn(principal.getUsername());
        when(users.loadUserByUsername(principal.getUsername())).thenReturn(principal);
        when(usuarios.findByEmailIgnoreCase(principal.getUsername())).thenReturn(java.util.Optional.of(usuario));
        when(jwt.valido("bearer-token", principal, 0)).thenReturn(true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer bearer-token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertEquals(principal.getUsername(),
            SecurityContextHolder.getContext().getAuthentication().getName());
    }
}
