package com.inpetu.connect.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuario_foto")
@Getter
@Setter
@NoArgsConstructor
public class UsuarioFoto {
    @Id
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Lob
    @Column(name = "conteudo", nullable = false, columnDefinition = "MEDIUMBLOB")
    private byte[] conteudo;

    @Column(name = "tipo_conteudo", nullable = false, length = 30)
    private String tipoConteudo = "image/jpeg";

    @Column(name = "atualizada_em", nullable = false)
    private LocalDateTime atualizadaEm = LocalDateTime.now();
}
