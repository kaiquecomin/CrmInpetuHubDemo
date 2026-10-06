package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "duvida_atendimento") @Getter @Setter @NoArgsConstructor
public class DuvidaAtendimento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_duvida") private Integer idDuvida;
    @Column(name = "email_contato", nullable = false, length = 100) private String emailContato;
    @Column(name = "telefone_contato", length = 20) private String telefoneContato;
    @Lob @Column(name = "mensagem_duvida", nullable = false) private String mensagemDuvida;
    @Column(name = "caminho_anexo", length = 255) private String caminhoAnexo;
    @Column(name = "status_atendimento", nullable = false, length = 30) private String statusAtendimento = "Pendente";
    @Lob @Column(name = "resposta_equipe") private String respostaEquipe;
    @Column(name = "data_envio", nullable = false) private LocalDateTime dataEnvio = LocalDateTime.now();
    @Column(name = "data_resposta") private LocalDateTime dataResposta;
    @Column(name = "id_usuario_atendente") private Integer idUsuarioAtendente;
}
