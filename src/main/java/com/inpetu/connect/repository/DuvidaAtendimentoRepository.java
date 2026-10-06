package com.inpetu.connect.repository;

import com.inpetu.connect.model.DuvidaAtendimento;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DuvidaAtendimentoRepository extends JpaRepository<DuvidaAtendimento, Integer> {
    boolean existsByEmailContatoAndMensagemDuvida(String emailContato, String mensagemDuvida);
}
