package com.inpetu.connect.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "espaco_foto")
@Getter
@Setter
@NoArgsConstructor
public class EspacoFoto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_espaco_foto")
    private Integer idEspacoFoto;

    @Column(name = "id_espaco", nullable = false)
    private Integer idEspaco;

    @Column(nullable = false, length = 100)
    private String arquivo;

    @Column(name = "tipo_imagem", nullable = false, length = 30)
    private String tipoImagem;

    @Column(length = 200)
    private String legenda;

    @Column(nullable = false)
    private Integer ordem = 0;
}
