package com.inpetu.connect.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inpetu.connect.model.CadastroPendente;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.CadastroPendenteRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.service.CadastroPublicoService;
import com.inpetu.connect.service.EmailDomainValidator;
import com.inpetu.connect.service.EmailSender;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CadastroConfirmacaoFluxoTest {
    private static final String SIGNUP_URL = "/api/v1/usuarios/cadastro-publico";
    private static final String CONFIRM_URL = "/api/v1/usuarios/confirmar-email";
    private static final String RESEND_URL = "/api/v1/usuarios/reenviar-confirmacao";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String DATABASE_NAME =
        "cadastro_" + UUID.randomUUID().toString().replace("-", "");

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private CapturingEmailSender emailSender;
    @Autowired private CadastroPendenteRepository pendentes;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private OrganizacaoRepository organizacoes;
    @Autowired private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void testProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () ->
            "jdbc:h2:mem:" + DATABASE_NAME + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        properties.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        properties.add("spring.datasource.username", () -> "sa");
        properties.add("spring.datasource.password", () -> "");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        properties.add("spring.sql.init.mode", () -> "never");
        properties.add("app.jwt.secret", CadastroConfirmacaoFluxoTest::randomSecret);
        properties.add("APP_RATE_LIMIT_SECRET", CadastroConfirmacaoFluxoTest::randomSecret);
    }

    @BeforeEach
    void clearCapturedMessages() {
        emailSender.clear();
        jdbcTemplate.update("DELETE FROM evento_cadastro");
        seedProfiles();
    }

    @Test
    void cadastroEmailEConfirmacaoCriamContaUmaUnicaVez() throws Exception {
        String email = uniqueTestEmail();
        String password = randomSecret();

        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, password)))
            .andExpect(status().isAccepted());

        String tokenFromEmail = tokenFrom(emailSender.takeLink());
        assertEquals(32, Base64.getUrlDecoder().decode(tokenFromEmail).length);
        CadastroPendente savedPending = pendentes.findByEmailIgnoreCase(email).orElseThrow();
        assertTrue(tokenHashMatches(tokenFromEmail, savedPending.getTokenHash()),
            "O hash persistido deve ser SHA-256 puro do token do link.");
        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(tokenFromEmail)))
            .andExpect(status().isCreated());

        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElse(null);
        assertNotNull(usuario);
        assertTrue(usuario.getAtivo());
        Organizacao organizacao = organizacoes.findById(usuario.getIdOrganizacao()).orElse(null);
        assertNotNull(organizacao);
        assertTrue(organizacao.getAtivo());
        assertFalse(pendentes.findByEmailIgnoreCase(email).isPresent());
    }

    @Test
    void tokenExpiradoNaoConfirmaCadastro() throws Exception {
        String email = uniqueTestEmail();

        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, randomSecret())))
            .andExpect(status().isAccepted());

        String tokenFromEmail = tokenFrom(emailSender.takeLink());
        CadastroPendente pendente = pendentes.findByEmailIgnoreCase(email).orElseThrow();
        pendente.setExpiraEm(LocalDateTime.now().minusMinutes(1));
        pendentes.save(pendente);

        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(tokenFromEmail)))
            .andExpect(status().isBadRequest())
            .andExpect(result -> assertEquals("Link inválido ou expirado",
                objectMapper.readTree(result.getResponse().getContentAsString()).get("mensagem").asText()));
        assertTrue(usuarios.findByEmailIgnoreCase(email).isEmpty());
    }

    @Test
    void tokenAdulteradoNaoConfirmaCadastro() throws Exception {
        String email = uniqueTestEmail();
        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, randomSecret())))
            .andExpect(status().isAccepted());

        String token = tokenFrom(emailSender.takeLink());
        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(tamper(token))))
            .andExpect(status().isBadRequest())
            .andExpect(result -> assertEquals("Link inválido ou expirado",
                objectMapper.readTree(result.getResponse().getContentAsString()).get("mensagem").asText()));
        assertTrue(usuarios.findByEmailIgnoreCase(email).isEmpty());
    }

    @Test
    void cadastroDuplicadoNaoEnviaNovoEmailParaContaExistente() throws Exception {
        String email = uniqueTestEmail();
        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, randomSecret())))
            .andExpect(status().isAccepted());
        String token = tokenFrom(emailSender.takeLink());

        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(token)))
            .andExpect(status().isCreated());

        String newEmail = uniqueTestEmail();
        var newSignup = mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(newEmail, randomSecret())))
            .andExpect(status().isAccepted())
            .andReturn();
        String newSignupBody = newSignup.getResponse().getContentAsString();
        tokenFrom(emailSender.takeLink());
        int sentBeforeDuplicate = emailSender.size();

        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, randomSecret())))
            .andExpect(status().isAccepted())
            .andExpect(result -> assertEquals(newSignupBody,
                result.getResponse().getContentAsString()));
        assertEquals(sentBeforeDuplicate, emailSender.size());
    }

    @Test
    void confirmacaoCriaUsuarioComPerfilSolicitante() throws Exception {
        String email = uniqueTestEmail();
        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, randomSecret())))
            .andExpect(status().isAccepted());
        String token = tokenFrom(emailSender.takeLink());

        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(token)))
            .andExpect(status().isCreated());

        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        assertEquals(4, usuario.getIdPerfil());
        assertEquals(1, jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM perfil_acesso WHERE id_perfil = 4", Integer.class));
    }

    @Test
    void reenvioInvalidaTokenAnterior() throws Exception {
        String email = uniqueTestEmail();
        mvc.perform(post(SIGNUP_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, randomSecret())))
            .andExpect(status().isAccepted());
        String oldToken = tokenFrom(emailSender.takeLink());

        CadastroPendente pending = pendentes.findByEmailIgnoreCase(email).orElseThrow();
        pending.setUltimoEnvioEm(LocalDateTime.now().minusMinutes(2));
        pendentes.save(pending);

        mvc.perform(post(RESEND_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(resendJson(email)))
            .andExpect(status().isAccepted());
        String newToken = tokenFrom(emailSender.takeLink());
        assertFalse(oldToken.equals(newToken));

        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(oldToken)))
            .andExpect(status().isBadRequest());
        mvc.perform(post(CONFIRM_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(confirmJson(newToken)))
            .andExpect(status().isCreated());
    }

    private String signupJson(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(new SignupBody(
            "Pessoa de Teste", email, null, "Organizacao de Teste", "Vinculo de Teste", password));
    }

    private String confirmJson(String token) throws Exception {
        return objectMapper.writeValueAsString(new ConfirmBody(token));
    }

    private String resendJson(String email) throws Exception {
        return objectMapper.writeValueAsString(new ResendBody(email));
    }

    private void seedProfiles() {
        String[][] profiles = {
            {"1", "Coordenador", "Acesso total"},
            {"2", "Gestor de Espaços", "Gestão de espaços"},
            {"3", "Staff/Atendente", "Atendimento"},
            {"4", "Solicitante Público", "Acesso público"}
        };
        for (String[] profile : profiles) {
            int id = Integer.parseInt(profile[0]);
            int count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM perfil_acesso WHERE id_perfil = ?", Integer.class, id);
            if (count == 0) {
                jdbcTemplate.update(
                    "INSERT INTO perfil_acesso (id_perfil, nome_perfil, descricao) VALUES (?, ?, ?)",
                    id, profile[1], profile[2]);
            }
        }
    }

    private static String uniqueTestEmail() {
        return "teste+" + UUID.randomUUID() + "@exemplo.test";
    }

    private static String randomSecret() {
        byte[] value = new byte[32];
        RANDOM.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private static String tokenFrom(String link) {
        String query = URI.create(link).getRawQuery();
        assertNotNull(query);
        String prefix = "token=";
        assertTrue(query.startsWith(prefix));
        return URLDecoder.decode(query.substring(prefix.length()), StandardCharsets.UTF_8);
    }

    private static boolean tokenHashMatches(String rawToken, String storedHash) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
            .digest(rawToken.getBytes(StandardCharsets.UTF_8));
        return MessageDigest.isEqual(
            HexFormat.of().formatHex(digest).getBytes(StandardCharsets.US_ASCII),
            storedHash.getBytes(StandardCharsets.US_ASCII));
    }

    private static String tamper(String token) {
        char replacement = token.charAt(0) == 'A' ? 'B' : 'A';
        return replacement + token.substring(1);
    }

    private record SignupBody(String nomeCompleto, String email, String telefone,
                              String organizacao, String cargoVinculo, String senha) {}
    private record ConfirmBody(String token) {}
    private record ResendBody(String email) {}

    @TestConfiguration(proxyBeanMethods = false)
    static class TestBeans {
        @Bean
        @Primary
        EmailDomainValidator testEmailDomainValidator() {
            return new EmailDomainValidator() {
                @Override
                public void validate(String email) {}
            };
        }

        @Bean
        @Primary
        CapturingEmailSender capturingEmailSender() {
            return new CapturingEmailSender();
        }
    }

    static class CapturingEmailSender implements EmailSender {
        private final BlockingQueue<String> rawTokens = new LinkedBlockingQueue<>();
        private final AtomicInteger sentCount = new AtomicInteger();

        @Override
        public void sendConfirmation(CadastroPendente pendente, String rawToken) {
            rawTokens.add(rawToken);
            sentCount.incrementAndGet();
        }

        String takeLink() throws InterruptedException {
            String rawToken = rawTokens.poll(5, TimeUnit.SECONDS);
            assertNotNull(rawToken);
            String link = "https://public.example.test/" +
                "confirmar?token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
            return link;
        }

        int size() {
            return sentCount.get();
        }

        void clear() {
            rawTokens.clear();
            sentCount.set(0);
        }
    }
}
