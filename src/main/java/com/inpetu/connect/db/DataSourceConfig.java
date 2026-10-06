package com.inpetu.connect.db;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Cria o banco principal e (opcionalmente) o banco de teste, e um DataSource "roteador"
 * que escolhe um deles a cada requisição, conforme {@link DbContext}.
 * Sem DB_TEST_URL só o principal existe e o seletor do site fica desativado.
 */
@Configuration
public class DataSourceConfig {

    @Bean
    DbRegistry dbRegistry(@Value("${app.db.main.url}") String mainUrl,
                          @Value("${app.db.main.user}") String mainUser,
                          @Value("${app.db.main.password}") String mainPassword,
                          @Value("${app.db.test.url:}") String testUrl,
                          @Value("${app.db.test.user:}") String testUser,
                          @Value("${app.db.test.password:}") String testPassword) {
        HikariDataSource main = criar(mainUrl, mainUser, mainPassword, "pool-principal");
        HikariDataSource test = testUrl == null || testUrl.isBlank() ? null : criar(testUrl, testUser, testPassword, "pool-teste");
        return new DbRegistry(main, test);
    }

    @Bean
    @Primary
    DataSource dataSource(DbRegistry registry) {
        Map<Object, Object> destinos = new HashMap<>();
        destinos.put(DbContext.MAIN, registry.main());
        if (registry.testEnabled()) destinos.put(DbContext.TEST, registry.test());
        RoutingDataSource routing = new RoutingDataSource();
        routing.setTargetDataSources(destinos);
        routing.setDefaultTargetDataSource(registry.main());
        routing.afterPropertiesSet();
        return routing;
    }

    private static HikariDataSource criar(String url, String user, String password, String nome) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(user);
        ds.setPassword(password);
        ds.setPoolName(nome);
        ds.setMaximumPoolSize(5);
        ds.setMinimumIdle(1);
        ds.setInitializationFailTimeout(-1); // não derruba o app se um dos bancos estiver fora na subida
        return ds;
    }
}
