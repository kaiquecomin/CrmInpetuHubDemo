package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "organizacao") @Getter @Setter @NoArgsConstructor
public class Organizacao {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_organizacao") private Integer idOrganizacao;
    @Column(name = "nome_organizacao", nullable = false, length = 100) private String nomeOrganizacao;
    @Column(name = "cnpj_documento", length = 20) private String cnpjDocumento;
    @Column(name = "tipo_organizacao", length = 50) private String tipoOrganizacao;
    @Column(nullable = false) private Boolean ativo = true;
    @Lob @Column(name = "motivo_descredenciamento") private String motivoDescredenciamento;
    @Column(name = "data_descredenciamento") private LocalDateTime dataDescredenciamento;
    @Column(name = "id_usuario_descredenciou") private Integer idUsuarioDescredenciou;
}
