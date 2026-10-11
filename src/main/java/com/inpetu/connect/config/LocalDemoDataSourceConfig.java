package com.inpetu.connect.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
@Profile("demo")
public class LocalDemoDataSourceConfig {
    @Bean
    DataSource demoDataSource(DataSourceProperties properties) {
        LocalDemoDatabaseGuard.requireLocalMySql(properties.determineUrl());
        return properties.initializeDataSourceBuilder().build();
    }
}
