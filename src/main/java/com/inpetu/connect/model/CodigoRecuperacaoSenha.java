package com.inpetu.connect.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "codigo_recuperacao_senha")
@Getter
@Setter
@NoArgsConstructor
public class CodigoRecuperacaoSenha {
    @Id
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "codigo_hmac", nullable = false, length = 64)
    private String codigoHmac;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(nullable = false)
    private Integer tentativas = 0;
}
