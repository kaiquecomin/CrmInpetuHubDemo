package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "cadastro_pendente", indexes = {
    @Index(name = "idx_cadastro_pendente_email", columnList = "email"),
    @Index(name = "idx_cadastro_pendente_token_hash", columnList = "token_hash"),
    @Index(name = "idx_cadastro_pendente_expira_em", columnList = "expira_em")
})
@Getter @Setter @NoArgsConstructor
public class CadastroPendente {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "nome_completo", nullable = false, length = 100)
    private String nomeCompleto;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "telefone", length = 20)
    private String telefone;

    @Column(name = "cargo_vinculo", length = 100)
    private String cargoVinculo;

    @Column(name = "nome_organizacao", nullable = false, length = 100)
    private String nomeOrganizacao;

    @Column(name = "senha_hash", nullable = false, length = 255)
    private String senhaHash;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Column(name = "ultimo_envio_em")
    private LocalDateTime ultimoEnvioEm;

    @Column(name = "total_envios", nullable = false)
    private Integer totalEnvios = 0;
}
