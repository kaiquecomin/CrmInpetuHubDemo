package com.inpetu.connect.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.InitialDirContext;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Locale;
import java.util.Set;

@Component
public class EmailDomainValidator {
    private static final Logger logger = LoggerFactory.getLogger(EmailDomainValidator.class);
    private static final Set<String> DISPOSABLE_DOMAINS = loadDisposableDomains();

    public void validate(String email) {
        String domain = extractDomain(email);
        if (domain == null || domain.isBlank()) {
            throw new IllegalArgumentException("Não foi possível usar este e-mail. Verifique o endereço.");
        }

        String normalized = domain.toLowerCase(Locale.ROOT);
        if (DISPOSABLE_DOMAINS.contains(normalized)) {
            throw new IllegalArgumentException("Não foi possível usar este e-mail. Verifique o endereço.");
        }

        try {
            if (!hasMxOrARecord(normalized)) {
                throw new IllegalArgumentException("Não foi possível usar este e-mail. Verifique o endereço.");
            }
        } catch (RuntimeException e) {
            logger.warn("Falha ao validar DNS do domínio {} na confirmação de cadastro.", normalized, e);
        }
    }

    private boolean hasMxOrARecord(String domain) {
        try {
            Hashtable<String, Object> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "2000");
            env.put("com.sun.jndi.dns.timeout.retries", "1");
            InitialDirContext context = new InitialDirContext(env);
            try {
                Attributes mxAttributes = context.getAttributes(domain, new String[] { "MX" });
                Attribute mx = mxAttributes.get("MX");
                if (mx != null && mx.size() > 0) {
                    return true;
                }
                Attributes aAttributes = context.getAttributes(domain, new String[] { "A" });
                Attribute a = aAttributes.get("A");
                return a != null && a.size() > 0;
            } finally {
                context.close();
            }
        } catch (NamingException e) {
            throw new IllegalStateException("DNS não respondeu para o domínio do e-mail", e);
        }
    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) return null;
        String[] parts = email.split("@", 2);
        return parts.length == 2 ? parts[1].trim() : null;
    }

    private static Set<String> loadDisposableDomains() {
        Set<String> domains = new HashSet<>();
        try {
            ClassPathResource resource = new ClassPathResource("disposable-domains.txt");
            if (!resource.exists()) {
                return domains;
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                        domains.add(trimmed.toLowerCase(Locale.ROOT));
                    }
                }
            }
        } catch (IOException e) {
            logger.warn("Não foi possível carregar disposable-domains.txt.", e);
        }
        return Set.copyOf(domains);
    }
}
