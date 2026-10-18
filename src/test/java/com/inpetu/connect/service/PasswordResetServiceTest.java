package com.inpetu.connect.service;

import com.inpetu.connect.model.CodigoRecuperacaoSenha;
import com.inpetu.connect.model.EventoCadastro;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.CodigoRecuperacaoSenhaRepository;
import com.inpetu.connect.repository.EventoCadastroRepository;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PasswordResetServiceTest {
    private static final String EMAIL = "person@example.test";
    private static final String OTP_SECRET = "test-otp-secret-with-at-least-32-chars";
    private static final String RATE_SECRET = "test-rate-secret-with-at-least-32-chars";

    private final UsuarioRepository users = mock(UsuarioRepository.class);
    private final CodigoRecuperacaoSenhaRepository codes = mock(CodigoRecuperacaoSenhaRepository.class);
    private final EventoCadastroRepository events = mock(EventoCadastroRepository.class);
    private final LogAuditoriaRepository audit = mock(LogAuditoriaRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final EmailSender emailSender = mock(EmailSender.class);
    private final PasswordResetService service = new PasswordResetService(
        users, codes, events, audit, passwordEncoder, emailSender,
        "", OTP_SECRET, RATE_SECRET, false, false, new org.springframework.core.env.StandardEnvironment());
    private final MockHttpServletRequest request = new MockHttpServletRequest();

    @BeforeEach
    void prepareRateLimits() {
        request.setRemoteAddr("127.0.0.1");
        when(events.countByTipoAndEmailHashAndCriadoEmAfter(any(), anyString(), any())).thenReturn(0L);
        when(events.countByTipoAndIpHashAndCriadoEmAfter(any(), anyString(), any())).thenReturn(0L);
        when(events.save(any(EventoCadastro.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void requestUsesTheSameAcceptedResponseForExistingAndUnknownAddresses() {
        Usuario active = user();
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(active));

        var existing = service.solicitar(EMAIL, request);
        var unknown = service.solicitar("unknown@example.test", request);

        assertEquals(HttpStatus.ACCEPTED, existing.getStatusCode());
        assertEquals(existing.getStatusCode(), unknown.getStatusCode());
        assertEquals(existing.getBody(), unknown.getBody());
        verify(codes).save(any(CodigoRecuperacaoSenha.class));
        verify(emailSender, never()).sendPasswordResetCode(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void persistsOnlyTheHmacForTheRequestedCodeAndInvalidatesPreviousCodes() {
        Usuario active = user();
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(active));
        when(codes.save(any(CodigoRecuperacaoSenha.class))).thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.ArgumentCaptor<CodigoRecuperacaoSenha> saved =
            org.mockito.ArgumentCaptor.forClass(CodigoRecuperacaoSenha.class);

        service.solicitar(EMAIL, request);
        service.solicitar(EMAIL, request);
        verify(codes, org.mockito.Mockito.times(2)).save(saved.capture());
        assertEquals(11, saved.getAllValues().get(0).getIdUsuario());
        assertEquals(saved.getAllValues().get(0).getIdUsuario(), saved.getAllValues().get(1).getIdUsuario());
        assertEquals(64, saved.getAllValues().get(0).getCodigoHmac().length());
    }

    @Test
    void invalidCodeAttemptsArePersistedAndTheFifthInvalidatesTheCode() {
        Usuario active = user();
        CodigoRecuperacaoSenha entry = validEntry();
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(active));
        when(codes.findLockedByIdUsuario(11)).thenReturn(Optional.of(entry));

        for (int attempt = 1; attempt < 5; attempt++) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.validar(EMAIL, "000000", request));
            assertEquals("Código inválido ou expirado. Peça um novo código.", error.getReason());
            assertEquals(attempt, entry.getTentativas());
        }
        ResponseStatusException exhausted = assertThrows(ResponseStatusException.class,
            () -> service.validar(EMAIL, "000000", request));

        assertEquals(HttpStatus.BAD_REQUEST, exhausted.getStatusCode());
        assertEquals("Número máximo de tentativas atingido. Peça um novo código.", exhausted.getReason());
        verify(codes).delete(entry);
    }

    @Test
    void expiredCodeIsDeletedAndRejected() {
        Usuario active = user();
        CodigoRecuperacaoSenha entry = validEntry();
        entry.setExpiraEm(LocalDateTime.now().minusSeconds(1));
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(active));
        when(codes.findLockedByIdUsuario(11)).thenReturn(Optional.of(entry));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.validar(EMAIL, "123456", request));

        assertEquals("Código inválido ou expirado. Peça um novo código.", error.getReason());
        verify(codes).delete(entry);
    }

    @Test
    void resettingPasswordConsumesTheCodeAndInvalidatesExistingSessions() {
        Usuario active = user();
        CodigoRecuperacaoSenha entry = validEntry();
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(active));
        when(codes.findLockedByIdUsuario(11)).thenReturn(Optional.of(entry), Optional.empty());
        when(passwordEncoder.encode("fresh-password")).thenReturn("bcrypt-new-hash");
        when(users.save(active)).thenReturn(active);

        var response = service.redefinir(EMAIL, "123456", "fresh-password", request);
        ResponseStatusException reused = assertThrows(ResponseStatusException.class,
            () -> service.redefinir(EMAIL, "123456", "fresh-password", request));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("bcrypt-new-hash", active.getSenhaHash());
        assertEquals(false, active.getSenhaTemporaria());
        assertEquals(8, active.getVersaoToken());
        assertEquals("Código inválido ou expirado. Peça um novo código.", reused.getReason());
        verify(codes).delete(entry);
        verify(audit).save(org.mockito.ArgumentMatchers.argThat(log ->
            "REDEFINICAO_SENHA".equals(log.getAcao())
                && "Senha redefinida pelo fluxo de recuperação.".equals(log.getDetalhesAlteracao())));
    }

    @Test
    void rateLimitReturnsAnExplicitTooManyRequestsResponse() {
        when(events.countByTipoAndEmailHashAndCriadoEmAfter(
            eq(EventoCadastro.TipoEvento.RESET_ENVIO), anyString(), any())).thenReturn(3L);

        var response = service.solicitar(EMAIL, request);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("3600", response.getHeaders().getFirst("Retry-After"));
        assertEquals("Muitas tentativas. Tente novamente em alguns minutos.",
            response.getBody().get("mensagem"));
        verify(users, never()).findByEmailIgnoreCase(anyString());
    }

    @Test
    void forgedForwardedAddressesCannotBypassTheTenRequestIpLimit() {
        PasswordResetService trustedProxyService = new PasswordResetService(
            users, codes, events, audit, passwordEncoder, emailSender,
            "10.0.0.2,10.0.0.3", OTP_SECRET, RATE_SECRET, false, false,
            new org.springframework.core.env.StandardEnvironment());
        List<EventoCadastro> recordedEvents = new ArrayList<>();
        when(events.save(any(EventoCadastro.class))).thenAnswer(invocation -> {
            EventoCadastro event = invocation.getArgument(0);
            recordedEvents.add(event);
            return event;
        });
        when(events.countByTipoAndIpHashAndCriadoEmAfter(
            eq(EventoCadastro.TipoEvento.RESET_ENVIO), anyString(), any()))
            .thenAnswer(invocation -> recordedEvents.stream()
                .filter(event -> event.getTipo() == EventoCadastro.TipoEvento.RESET_ENVIO
                    && invocation.<String>getArgument(1).equals(event.getIpHash()))
                .count());

        List<org.springframework.http.ResponseEntity<java.util.Map<String, String>>> responses = new ArrayList<>();
        for (int attempt = 1; attempt <= 11; attempt++) {
            MockHttpServletRequest forwarded = forwardedRequest(
                "198.51.100." + attempt + ", 203.0.113.42, 10.0.0.3");
            responses.add(trustedProxyService.solicitar(
                "unknown-" + attempt + "@example.test", forwarded));
        }

        assertEquals(10, responses.stream().filter(response ->
            response.getStatusCode() == HttpStatus.ACCEPTED).count());
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, responses.get(10).getStatusCode());
        assertEquals("3600", responses.get(10).getHeaders().getFirst("Retry-After"));
        assertEquals(1, recordedEvents.stream().map(EventoCadastro::getIpHash).distinct().count());
    }

    private MockHttpServletRequest forwardedRequest(String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Forwarded-For", forwardedFor);
        return request;
    }

    private Usuario user() {
        Usuario user = new Usuario();
        user.setIdUsuario(11);
        user.setEmail(EMAIL);
        user.setNomeCompleto("Pessoa");
        user.setAtivo(true);
        user.setSenhaHash("bcrypt-old-hash");
        user.setVersaoToken(7);
        user.setSenhaTemporaria(true);
        return user;
    }

    private CodigoRecuperacaoSenha validEntry() {
        CodigoRecuperacaoSenha entry = new CodigoRecuperacaoSenha();
        entry.setIdUsuario(11);
        entry.setCodigoHmac(codeHmac("123456"));
        entry.setExpiraEm(LocalDateTime.now().plusMinutes(10));
        entry.setTentativas(0);
        return entry;
    }

    private String codeHmac(String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(OTP_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(code.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }
}
