package com.inpetu.connect;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.repository.UsuarioRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackageClasses = Espaco.class)
@EnableJpaRepositories(basePackageClasses = UsuarioRepository.class)
public class InpetuConnectApplication {
    public static void main(String[] args) {
        SpringApplication.run(InpetuConnectApplication.class, args);
    }
}
