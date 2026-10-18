package com.inpetu.connect.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "espaco") @Getter @Setter @NoArgsConstructor
public class Espaco {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_espaco") private Integer idEspaco;
    @Column(name = "nome_espaco", nullable = false, length = 100) private String nomeEspaco;
    @Column(name = "tipo_espaco", nullable = false, length = 50) private String tipoEspaco;
    @JsonIgnore
    @Column(name = "codigo_catalogo", length = 50) private String codigoCatalogo;
    @Column(name = "arquivo_imagem", length = 100) private String arquivoImagem;
    @Column(name = "tipo_imagem", length = 30) private String tipoImagem;
    @Column(name = "capacidade_pessoas") private Integer capacidadePessoas;
    @Lob @Column(name = "equipamentos_disponiveis") private String equipamentosDisponiveis;
    @Column(name = "descricao", columnDefinition = "TEXT") private String descricao;
    @Column(name = "exige_aprovacao_manual", nullable = false) private Boolean exigeAprovacaoManual = false;
    @Column(nullable = false) private Boolean ativo = true;
    @Column(name = "motivo_indisponibilidade", length = 500) private String motivoIndisponibilidade;
    @Column(name = "data_previsao_retorno") private LocalDate dataPrevisaoRetorno;
    @Column(name = "data_criacao", nullable = false) private LocalDateTime dataCriacao = LocalDateTime.now();
    @Column(name = "id_usuario_criador") private Integer idUsuarioCriador;
}
