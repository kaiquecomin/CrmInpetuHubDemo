package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "cancelamento_reserva") @Getter @Setter @NoArgsConstructor
public class CancelamentoReserva {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_cancelamento") private Integer idCancelamento;
    @Column(name = "id_reserva", nullable = false, unique = true) private Integer idReserva;
    @Lob @Column(name = "motivo_cancelamento", nullable = false) private String motivoCancelamento;
    @Column(name = "data_cancelamento", nullable = false) private LocalDateTime dataCancelamento = LocalDateTime.now();
    @Column(name = "id_usuario_responsavel") private Integer idUsuarioResponsavel;
}
