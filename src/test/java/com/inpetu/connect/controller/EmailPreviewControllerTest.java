package com.inpetu.connect.controller;

import com.inpetu.connect.service.EmailTemplateRenderer;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailPreviewControllerTest {
    @Test
    void rendersBothDevelopmentEmailsVisuallyWithSampleData() {
        String preview = new EmailPreviewController(new EmailTemplateRenderer()).preview();

        assertTrue(preview.contains("E-mail de confirmação"));
        assertTrue(preview.contains("E-mail de redefinição de senha"));
        assertTrue(preview.contains("srcdoc=\"&lt;!doctype html&gt;"));
        assertTrue(preview.contains("482917"));
        assertFalse(preview.contains("{{NOME}}"));
        assertFalse(preview.contains("{{CODIGO}}"));
    }
}
