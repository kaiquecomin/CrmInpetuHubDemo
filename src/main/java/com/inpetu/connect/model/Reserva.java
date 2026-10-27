package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity @Table(name = "reserva", indexes = @Index(name = "idx_reserva_espaco_data", columnList = "id_espaco,data_reserva")) @Getter @Setter @NoArgsConstructor
public class Reserva {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_reserva") private Integer idReserva;
    @Column(name = "titulo_evento", nullable = false, length = 500) private String tituloEvento;
    @Lob @Column(name = "descricao_finalidade") private String descricaoFinalidade;
    @Column(name = "data_reserva", nullable = false) private LocalDate dataReserva;
    @Column(name = "horario_inicio", nullable = false) private LocalTime horarioInicio;
    @Column(name = "horario_fim", nullable = false) private LocalTime horarioFim;
    @Column(name = "quantidade_participantes") private Integer quantidadeParticipantes;
    @Column(name = "status_reserva", nullable = false, length = 30) private String statusReserva = "Pendente";
    @Column(name = "id_espaco", nullable = false) private Integer idEspaco;
    @Column(name = "id_solicitante", nullable = false) private Integer idSolicitante;
    @Column(name = "telefone_contato", length = 20) private String telefoneContato;
    @Column(name = "data_solicitacao", nullable = false) private LocalDateTime dataSolicitacao = LocalDateTime.now();
    @Column(name = "id_usuario_aprovador") private Integer idUsuarioAprovador;
    @Column(name = "data_aprovacao") private LocalDateTime dataAprovacao;
    @Column(name = "excede_cota", nullable = false) private Boolean excedeCota = false;
    @Lob @Column(name = "observacao_negociacao") private String observacaoNegociacao;
    @Column(name = "data_negociacao") private LocalDateTime dataNegociacao;
    @Column(name = "id_usuario_negociacao") private Integer idUsuarioNegociacao;
}
