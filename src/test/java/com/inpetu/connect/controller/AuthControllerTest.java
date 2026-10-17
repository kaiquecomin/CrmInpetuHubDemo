package com.inpetu.connect.controller;

import com.inpetu.connect.dto.CadastroPublicoRequest;
import com.inpetu.connect.dto.LoginRequest;
import com.inpetu.connect.model.CadastroPendente;
import com.inpetu.connect.model.EventoCadastro;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.CadastroPendenteRepository;
import com.inpetu.connect.repository.EventoCadastroRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioFotoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.security.JwtService;
import com.inpetu.connect.service.CadastroPublicoService;
import com.inpetu.connect.security.LoginAttemptService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthControllerTest {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final AuthenticationManager authentication = mock(AuthenticationManager.class);
    private final JwtService jwt = mock(JwtService.class);
    private final UserDetailsService userDetails = mock(UserDetailsService.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final UsuarioFotoRepository fotos = mock(UsuarioFotoRepository.class);
    private final OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
    private final CadastroPendenteRepository pendentes = mock(CadastroPendenteRepository.class);
    private final EventoCadastroRepository eventos = mock(EventoCadastroRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final CadastroPublicoService cadastroPublicoService = new CadastroPublicoService(
        usuarios,
        organizacoes,
        pendentes,
        eventos,
        passwordEncoder,
        new com.inpetu.connect.service.EmailDomainValidator() {
            @Override
            public void validate(String email) {
            }
        },
        new com.inpetu.connect.service.EmailSender() {
            @Override
            public void sendConfirmation(com.inpetu.connect.model.CadastroPendente pendente, String rawToken) {
            }

            @Override
            public void sendConfirmationCode(com.inpetu.connect.model.CadastroPendente pendente, String code,
                                             int validityMinutes) {
            }

            @Override
            public void sendPasswordResetCode(String email, String name, String code, int validityMinutes) {
            }
        },
        "",
        randomSecret(),
        randomSecret());
    private final AuthController controller = new AuthController(
        authentication,
        jwt,
        userDetails,
        usuarios,
        fotos,
        organizacoes,
        passwordEncoder,
        new LoginAttemptService(5, 60),
        "",
        cadastroPublicoService);

    @Test
    void duplicateAndNewPublicEmailsReceiveIdenticalAcceptedResponse() {
        CadastroPublicoRequest duplicate = signup("existing@example.test");
        CadastroPublicoRequest fresh = signup("new@example.test");
        when(usuarios.findByEmailIgnoreCase("existing@example.test")).thenReturn(Optional.of(new Usuario()));
        when(usuarios.findByEmailIgnoreCase("new@example.test")).thenReturn(Optional.empty());
        when(pendentes.findByEmailIgnoreCase("existing@example.test")).thenReturn(Optional.empty());
        when(pendentes.findByEmailIgnoreCase("new@example.test")).thenReturn(Optional.empty());
        when(pendentes.save(any(CadastroPendente.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(eventos.save(any(EventoCadastro.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        ResponseEntity<?> duplicateResponse = controller.cadastro(duplicate, request);
        ResponseEntity<?> newResponse = controller.cadastro(fresh, request);

        assertEquals(HttpStatus.ACCEPTED, duplicateResponse.getStatusCode());
        assertEquals(duplicateResponse.getStatusCode(), newResponse.getStatusCode());
        assertEquals(duplicateResponse.getBody(), newResponse.getBody());
        assertEquals("Enviamos um e-mail com as instruções de acesso.",
            CadastroPublicoService.SUCCESS_MESSAGE);
        assertEquals(CadastroPublicoService.SUCCESS_MESSAGE,
            ((java.util.Map<?, ?>) newResponse.getBody()).get("mensagem"));
        verify(usuarios, never()).save(any(Usuario.class));
        verify(organizacoes, never()).save(any(Organizacao.class));
        verify(pendentes, times(1)).save(any(CadastroPendente.class));
    }

    @Test
    void samePublicOrganizationNameCreatesSeparatePendingOrganizations() {
        when(usuarios.findByEmailIgnoreCase("first@example.test")).thenReturn(Optional.empty());
        when(usuarios.findByEmailIgnoreCase("second@example.test")).thenReturn(Optional.empty());
        when(pendentes.findByEmailIgnoreCase("first@example.test")).thenReturn(Optional.empty());
        when(pendentes.findByEmailIgnoreCase("second@example.test")).thenReturn(Optional.empty());
        when(pendentes.save(any(CadastroPendente.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(eventos.save(any(EventoCadastro.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        controller.cadastro(signup("first@example.test"), request);
        controller.cadastro(signup("second@example.test"), request);

        var pendentesSalvos = org.mockito.ArgumentCaptor.forClass(CadastroPendente.class);
        verify(pendentes, times(2)).save(pendentesSalvos.capture());
        assertEquals("Person Example", pendentesSalvos.getAllValues().get(0).getNomeCompleto());
        assertEquals("Person Example", pendentesSalvos.getAllValues().get(1).getNomeCompleto());
        assertEquals("Example Org", pendentesSalvos.getAllValues().get(0).getNomeOrganizacao());
        assertEquals("Example Org", pendentesSalvos.getAllValues().get(1).getNomeOrganizacao());
        verify(organizacoes, never()).save(any(Organizacao.class));
    }

    @Test
    void loginSetsSecureHttpOnlyCookieAndDoesNotReturnTokenInBody() {
        String password = randomSecret();
        String jwtToken = randomSecret();
        UserDetails principal = User.withUsername("coord@example.test").password(randomSecret()).roles("COORDENADOR").build();
        Usuario coordinator = new Usuario();
        coordinator.setNomeCompleto("Coordinator");
        coordinator.setEmail("coord@example.test");
        coordinator.setIdPerfil(1);
        when(userDetails.loadUserByUsername("coord@example.test")).thenReturn(principal);
        when(jwt.gerar(principal, 0)).thenReturn(jwtToken);
        when(jwt.expirationMs()).thenReturn(3_600_000L);
        when(usuarios.findByEmail("coord@example.test")).thenReturn(Optional.of(coordinator));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        var result = controller.login(new LoginRequest("coord@example.test", password),
            request, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(false, result.getBody().containsKey("token"));
        String cookie = response.getHeader("Set-Cookie");
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("HttpOnly"));
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("Secure"));
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("SameSite=Strict"));
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("Path=/"));
    }

    @Test
    void logoutExpiresJwtCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        var result = controller.logout(response);

        assertEquals(HttpStatus.NO_CONTENT, result.getStatusCode());
        String cookie = response.getHeader("Set-Cookie");
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("Max-Age=0"));
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("HttpOnly"));
        org.junit.jupiter.api.Assertions.assertTrue(cookie.contains("Secure"));
        org.junit.jupiter.api.Assertions.assertTrue(response.getHeaders("Set-Cookie").stream()
            .anyMatch(value -> value.contains("Path=/api/v1") && value.contains("Max-Age=0")));
    }

    private CadastroPublicoRequest signup(String email) {
        return new CadastroPublicoRequest("Person Example", email, null, "Example Org", "Researcher", randomSecret());
    }

    private static String randomSecret() {
        byte[] value = new byte[32];
        RANDOM.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
