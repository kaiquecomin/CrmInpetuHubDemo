package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "usuario") @Getter @Setter @NoArgsConstructor
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_usuario") private Integer idUsuario;
    @Column(name = "nome_completo", nullable = false, length = 100) private String nomeCompleto;
    @Column(nullable = false, unique = true, length = 100) private String email;
    @Column(length = 20) private String telefone;
    @Column(name = "cargo_vinculo", length = 100) private String cargoVinculo;
    @Column(name = "senha_hash", length = 255) private String senhaHash;
    @Column(name = "id_perfil", nullable = false) private Integer idPerfil;
    @Column(name = "id_persona") private Integer idPersona;
    @Column(name = "id_organizacao") private Integer idOrganizacao;
    @Column(nullable = false) private Boolean ativo = true;
    @Column(name = "data_cadastro", nullable = false) private LocalDateTime dataCadastro = LocalDateTime.now();
}
