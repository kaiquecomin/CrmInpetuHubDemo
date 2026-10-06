package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "item_ecossistema")
@Getter
@Setter
@NoArgsConstructor
public class ItemEcossistema {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_item_ecossistema")
    private Integer idItemEcossistema;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 600)
    private String descricao;

    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) not null default 'Parceiro'")
    private String categoria = "Parceiro";

    @Column(name = "url_destino", length = 500)
    private String urlDestino;

    @Column(name = "arquivo_logo", length = 100)
    private String arquivoLogo;

    @Column(name = "tipo_logo", length = 30)
    private String tipoLogo;

    @Column(nullable = false)
    private Integer ordem = 0;

    @Column(nullable = false)
    private Boolean ativo = true;
}
