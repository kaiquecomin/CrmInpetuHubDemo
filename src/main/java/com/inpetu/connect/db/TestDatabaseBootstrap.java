package com.inpetu.connect.db;

import com.inpetu.connect.config.DemoDataSeed;
import com.inpetu.connect.repository.*;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.EntityType;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * O Hibernate (ddl-auto=update) e o import.sql só rodam no banco principal.
 * Este runner prepara o banco de TESTE: cria/atualiza as tabelas, aplica o import.sql,
 * o seed do ecossistema e (opcional) os dados fictícios de demonstração.
 */
@Configuration
public class TestDatabaseBootstrap {
    private static final Logger log = LoggerFactory.getLogger(TestDatabaseBootstrap.class);

    @Bean
    @Order(1)
    ApplicationRunner prepararBancoDeTeste(
        DbRegistry registry,
        EntityManagerFactory emf,
        @Qualifier("seedEcossistema") ApplicationRunner seedEcossistema,
        UsuarioRepository usuarios, OrganizacaoRepository organizacoes, EspacoRepository espacos,
        ReservaRepository reservas, DuvidaAtendimentoRepository duvidas, PasswordEncoder encoder,
        @Value("${app.db.test.seed-demo:true}") boolean seedDemo,
        @Value("${app.demo.admin.email:admin@inpetuhub.ufsc.br}") String adminEmail,
        @Value("${app.demo.admin.password:DevAdmin-InPETU-2026!}") String adminPassword
    ) {
        return (ApplicationArguments args) -> {
            if (!registry.testEnabled()) { log.info("Banco de teste não configurado (DB_TEST_URL vazio): seletor desativado."); return; }
            try {
                atualizarTabelas(registry, emf);
                ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("import.sql"));
                populator.setSqlScriptEncoding("UTF-8");
                populator.execute(registry.test());
                executarNoTeste(() -> seedEcossistema.run(args));
                if (seedDemo) {
                    ApplicationRunner demo = new DemoDataSeed().seedDemoData(usuarios, organizacoes, espacos, reservas, duvidas, encoder, registry.testUrl(), true, adminEmail, adminPassword);
                    executarNoTeste(() -> demo.run(args));
                }
                log.info("Banco de teste pronto.");
            } catch (Exception ex) {
                log.error("Falha ao preparar o banco de teste. O banco principal segue funcionando. Causa: {}", ex.toString(), ex);
            }
        };
    }

    private interface Acao { void executar() throws Exception; }

    private static void executarNoTeste(Acao acao) throws Exception {
        DbContext.set(DbContext.TEST);
        try { acao.executar(); } finally { DbContext.clear(); }
    }

    /** Equivale ao spring.jpa.hibernate.ddl-auto=update, mas apontando para o banco de teste. */
    private static void atualizarTabelas(DbRegistry registry, EntityManagerFactory emf) {
        StandardServiceRegistry servicos = new StandardServiceRegistryBuilder()
            .applySetting(AvailableSettings.DATASOURCE, registry.test())
            .applySetting(AvailableSettings.PHYSICAL_NAMING_STRATEGY, "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
            .applySetting(AvailableSettings.IMPLICIT_NAMING_STRATEGY, "org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy")
            .applySetting(AvailableSettings.HBM2DDL_AUTO, "update")
            .build();
        try {
            MetadataSources fontes = new MetadataSources(servicos);
            for (EntityType<?> entidade : emf.getMetamodel().getEntities()) fontes.addAnnotatedClass(entidade.getJavaType());
            Metadata metadata = fontes.buildMetadata();
            metadata.buildSessionFactory().close();
        } finally {
            StandardServiceRegistryBuilder.destroy(servicos);
        }
    }
}
