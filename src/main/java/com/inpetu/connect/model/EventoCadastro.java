package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "evento_cadastro", indexes = {
    @Index(name = "idx_evento_cadastro_tipo", columnList = "tipo"),
    @Index(name = "idx_evento_cadastro_ip_hash", columnList = "ip_hash"),
    @Index(name = "idx_evento_cadastro_email_hash", columnList = "email_hash"),
    @Index(name = "idx_evento_cadastro_criado_em", columnList = "criado_em")
})
@Getter @Setter @NoArgsConstructor
public class EventoCadastro {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 20)
    private TipoEvento tipo;

    @Column(name = "ip_hash", length = 128)
    private String ipHash;

    @Column(name = "email_hash", length = 128)
    private String emailHash;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    public enum TipoEvento {
        CADASTRO,
        ENVIO
    }
}
