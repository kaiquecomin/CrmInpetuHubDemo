package com.inpetu.connect;

import com.inpetu.connect.config.OtpSecretValidator;
import com.inpetu.connect.controller.DuvidaController;
import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.security.SenhaTemporariaFilter;
import com.inpetu.connect.service.BrevoEmailClient;
import com.inpetu.connect.service.EmailTemplateRenderer;
import com.inpetu.connect.service.NotificacaoService;
import com.inpetu.connect.service.RateLimitSecretValidator;
import com.inpetu.connect.service.SmtpEmailSender;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.MediaType;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:context_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.hbm2ddl.import_files=hibernate-import.sql",
    "spring.sql.init.mode=never",
    "app.jwt.secret=context-test-jwt-secret-context-test-jwt-secret-123456",
    "OTP_SECRET=context-test-otp-secret-at-least-32-chars",
    "APP_RATE_LIMIT_SECRET=context-test-rate-limit-secret-32-chars",
    "app.mail.enabled=false",
    "app.features.mural=false",
    "app.upload.dir=target/test-uploads"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApplicationContextTest {
    @Autowired private ApplicationContext context;
    @Autowired private SmtpEmailSender smtpEmailSender;
    @Autowired private TemplateEngine templateEngine;
    @Autowired private MockMvc mockMvc;
    @Autowired private EspacoRepository espacoRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    @Test
    void loadsTheCompleteApplicationContextWithRealSpringComponents() {
        assertEquals("native", context.getEnvironment().getProperty("server.forward-headers-strategy"));
        assertTrue(context.getEnvironment().getProperty("server.tomcat.remoteip.internal-proxies")
            .contains("10\\."));
        assertSame(smtpEmailSender, context.getBean(SmtpEmailSender.class));
        assertNotNull(context.getBean(BrevoEmailClient.class));
        assertNotNull(context.getBean(EmailTemplateRenderer.class));
        assertNotNull(context.getBean(DuvidaController.class));
        assertNotNull(context.getBean(NotificacaoService.class));
        assertNotNull(context.getBean(SenhaTemporariaFilter.class));
        assertNotNull(context.getBean(RateLimitSecretValidator.class));
        assertNotNull(context.getBean(OtpSecretValidator.class));
    }

    @Test
    void servesTheReactEntryPointForPanelMuralAndUnknownRoutes() throws Exception {
        for (String route : List.of("/paineladm", "/mural", "/rota-inexistente")) {
            mockMvc.perform(get(route))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                    .forwardedUrl("/index.html"));
        }
    }

    @Test
    void disablesOptionalModuleWhenItsFeatureFlagIsOff() throws Exception {
        mockMvc.perform(get("/api/v1/config"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mural").value(false));
    }

    @Test
    void createsJsonSpaceFromPublicFieldsWithoutAcceptingInternalState() throws Exception {
        mockMvc.perform(post("/api/v1/espacos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "nomeEspaco": "Espaço de teste DTO",
                      "tipoEspaco": "Laboratório",
                      "capacidadePessoas": 12,
                      "descricao": "Descrição inicial",
                      "equipamentosDisponiveis": "Projetor",
                      "exigeAprovacaoManual": false,
                      "ativo": false,
                      "motivoIndisponibilidade": "Não deve ser aplicado",
                      "arquivoImagem": "injected.jpg"
                    }
                    """)
                .with(user("coordenador@example.test").roles("COORDENADOR")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nomeEspaco").value("Espaço de teste DTO"))
            .andExpect(jsonPath("$.ativo").value(true))
            .andExpect(jsonPath("$.motivoIndisponibilidade").value(nullValue()))
            .andExpect(jsonPath("$.arquivoImagem").value(nullValue()));
    }

    @Test
    void passwordRecoveryRequestUsesGenericResponseForUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unknown-" + UUID.randomUUID() + "@example.test\"}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.mensagem").value(
                "Se o e-mail estiver associado a uma conta ativa, enviaremos um código de recuperação."));
    }

    @Test
    void rendersTheServerSideAdministrativeDashboardTemplate() {
        Context variables = new Context(Locale.forLanguageTag("pt-BR"));
        variables.setVariable("nome", "Ana");
        variables.setVariable("hoje", LocalDate.of(2026, 10, 17));
        variables.setVariable("hojeLabel", "sábado, 17 de outubro");
        variables.setVariable("hojeFormatada", "17/10/2026");
        variables.setVariable("reservasHoje", 0);
        variables.setVariable("reservasPendentes", 0);
        variables.setVariable("espacosAtivos", 0);
        variables.setVariable("organizacoes", 0);
        variables.setVariable("duvidasPendentes", 0);
        variables.setVariable("agenda", List.of());

        String emptyDashboard = templateEngine.process("paineladm/index", variables);

        assertTrue(emptyDashboard.contains("Olá, <span>Ana</span>"));
        assertTrue(emptyDashboard.contains("Nenhuma reserva para hoje"));
        assertTrue(emptyDashboard.contains("/css/painel-administrativo.css"));

        variables.setVariable("agenda", List.of(new com.inpetu.connect.controller.PainelAdministrativoController.ReservaPainel(
                "Encontro de pesquisa", "Sala multiuso", "João Silva", "09:00", "10:00", "Pendente")));
        String populatedDashboard = templateEngine.process("paineladm/index", variables);

        assertTrue(populatedDashboard.contains("Encontro de pesquisa"));
        assertTrue(populatedDashboard.contains("09:00 – 10:00"));
        assertTrue(populatedDashboard.contains("pending"));
    }

    @Test
    void unauthenticatedNotificationRequestReturnsSessionExpiredJson() throws Exception {
        mockMvc.perform(get("/api/v1/notificacoes/minhas"))
            .andExpect(status().isUnauthorized())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.codigo").value("SESSAO_EXPIRADA"))
            .andExpect(jsonPath("$.mensagem").value("Sua sessão expirou. Entre novamente."));
    }

    @Test
    void coordinatorCanReadQuestionsAndAudit() throws Exception {
        mockMvc.perform(get("/api/v1/duvidas").with(user("coordenador").roles("COORDENADOR")))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auditoria").with(user("coordenador").roles("COORDENADOR")))
            .andExpect(status().isOk());
    }

    @Test
    void deniedRequestsReturnStandardJson() throws Exception {
        mockMvc.perform(get("/api/v1/auditoria").with(user("solicitante").roles("SOLICITANTE")))
            .andExpect(status().isForbidden())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"))
            .andExpect(jsonPath("$.mensagem").value("Você não tem permissão para esta ação."));
    }

    @Test
    void coordinatorCanUpdateSpaceAndPhotoRoutesValidatePermissionFormatAndNotFound() throws Exception {
        Espaco espaco = new Espaco();
        espaco.setNomeEspaco("Espaço para teste de edição");
        espaco.setTipoEspaco("Teste");
        espaco.setCapacidadePessoas(4);
        espaco.setAtivo(true);
        Espaco salvo = espacoRepository.save(espaco);

        String email = "espaco-coord-" + java.util.UUID.randomUUID() + "@inpetu.test";
        Usuario coordenador = new Usuario();
        coordenador.setNomeCompleto("Coordenação de teste");
        coordenador.setEmail(email);
        coordenador.setIdPerfil(1);
        usuarioRepository.save(coordenador);

        mockMvc.perform(multipart("/api/v1/espacos/{id}", salvo.getIdEspaco())
                .param("nomeEspaco", "Espaço atualizado")
                .param("tipoEspaco", "Reunião")
                .param("capacidadePessoas", "8")
                .param("equipamentosDisponiveis", "Tela")
                .param("descricao", "Descrição de teste")
                .param("exigeAprovacaoManual", "true")
                .with(user(email).roles("COORDENADOR"))
                .with(request -> {
                    request.setMethod("PUT");
                    return request;
                }))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.descricao").value("Descrição de teste"))
            .andExpect(jsonPath("$.exigeAprovacaoManual").value(true));

        MockMultipartFile imagemInvalida = new MockMultipartFile(
            "imagem", "foto.png", "image/png", new byte[] {1, 2, 3}
        );
        mockMvc.perform(multipart("/api/v1/espacos/{id}/fotos", salvo.getIdEspaco())
                .file(imagemInvalida)
                .with(user(email).roles("COORDENADOR")))
            .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/espacos/{id}/fotos", salvo.getIdEspaco())
                .file(imagemInvalida)
                .with(user("solicitante").roles("SOLICITANTE")))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/espacos/{id}/fotos/{fotoId}/imagem", salvo.getIdEspaco(), 999999))
            .andExpect(status().isNotFound());
    }


}
