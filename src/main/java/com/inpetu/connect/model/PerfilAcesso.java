package com.inpetu.connect.model;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "perfil_acesso") @Getter @Setter @NoArgsConstructor
public class PerfilAcesso {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "id_perfil") private Integer idPerfil;
    @Column(name = "nome_perfil", nullable = false, length = 50) private String nomePerfil;
    @Column(length = 200) private String descricao;
}
