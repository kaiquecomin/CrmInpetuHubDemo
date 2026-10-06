package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "log_auditoria") @Getter @Setter @NoArgsConstructor
public class LogAuditoria {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_log") private Integer idLog;
    @Column(name = "tabela_afetada", nullable = false, length = 50) private String tabelaAfetada;
    @Column(name = "id_registro_afetado") private Integer idRegistroAfetado;
    @Column(nullable = false, length = 50) private String acao;
    @Lob @Column(name = "detalhes_alteracao") private String detalhesAlteracao;
    @Column(name = "data_hora", nullable = false) private LocalDateTime dataHora = LocalDateTime.now();
    @Column(name = "id_usuario_responsavel") private Integer idUsuarioResponsavel;
}
