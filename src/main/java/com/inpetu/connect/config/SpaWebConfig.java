package com.inpetu.connect.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/confirmar").setViewName("forward:/index.html");
        registry.addViewController("/verificar-email").setViewName("forward:/index.html");
        registry.addViewController("/meu-portal").setViewName("forward:/index.html");
        registry.addViewController("/minhas-reservas").setViewName("forward:/index.html");
        registry.addViewController("/agendar").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/index.html");
        registry.addViewController("/cadastro").setViewName("forward:/index.html");
        registry.addViewController("/contato").setViewName("forward:/index.html");
    }
}
