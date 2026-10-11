package com.inpetu.connect;

import com.inpetu.connect.config.OtpSecretValidator;
import com.inpetu.connect.controller.DuvidaController;
import com.inpetu.connect.security.SenhaTemporariaFilter;
import com.inpetu.connect.service.BrevoEmailClient;
import com.inpetu.connect.service.EmailTemplateRenderer;
import com.inpetu.connect.service.NotificacaoService;
import com.inpetu.connect.service.RateLimitSecretValidator;
import com.inpetu.connect.service.SmtpEmailSender;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

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
    "app.mail.enabled=false"
})
@ActiveProfiles("test")
class ApplicationContextTest {
    @Autowired private ApplicationContext context;
    @Autowired private SmtpEmailSender smtpEmailSender;

    @Test
    void loadsTheCompleteApplicationContextWithRealSpringComponents() {
        assertSame(smtpEmailSender, context.getBean(SmtpEmailSender.class));
        assertNotNull(context.getBean(BrevoEmailClient.class));
        assertNotNull(context.getBean(EmailTemplateRenderer.class));
        assertNotNull(context.getBean(DuvidaController.class));
        assertNotNull(context.getBean(NotificacaoService.class));
        assertNotNull(context.getBean(SenhaTemporariaFilter.class));
        assertNotNull(context.getBean(RateLimitSecretValidator.class));
        assertNotNull(context.getBean(OtpSecretValidator.class));
    }
}
