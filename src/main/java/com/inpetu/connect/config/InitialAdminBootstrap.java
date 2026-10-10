package com.inpetu.connect.config;

import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("!demo")
public class InitialAdminBootstrap {
    @Bean
    ApplicationRunner bootstrapAdmin(
        UsuarioRepository usuarios,
        OrganizacaoRepository organizacoes,
        PasswordEncoder passwordEncoder,
        @Value("${app.bootstrap.admin.email:}") String email,
        @Value("${app.bootstrap.admin.password:}") String password
    ) {
        return (ApplicationArguments args) -> {
            if ((email == null || email.isBlank()) && (password == null || password.isBlank())) return;
            if (email == null || email.isBlank() || password == null || password.length() < 12 || password.length() > 72) {
                throw new IllegalStateException("Configure BOOTSTRAP_ADMIN_EMAIL e uma senha de 12 a 72 caracteres para criar o primeiro coordenador.");
            }
            String adminEmail = email.trim();
            if (usuarios.findByEmailIgnoreCase(adminEmail).isPresent()) return;

            Organizacao organizacao = organizacoes.findByNomeOrganizacaoIgnoreCase("UFSC / InPETU Hub").orElseGet(() -> {
                Organizacao nova = new Organizacao();
                nova.setNomeOrganizacao("UFSC / InPETU Hub");
                nova.setTipoOrganizacao("Instituição");
                return organizacoes.save(nova);
            });
            Usuario admin = new Usuario();
            admin.setNomeCompleto("Coordenador InPETU");
            admin.setEmail(adminEmail);
            admin.setCargoVinculo("Coordenação");
            admin.setSenhaHash(passwordEncoder.encode(password));
            admin.setIdPerfil(1);
            admin.setIdPersona(1);
            admin.setIdOrganizacao(organizacao.getIdOrganizacao());
            admin.setAtivo(true);
            usuarios.save(admin);
        };
    }
}
