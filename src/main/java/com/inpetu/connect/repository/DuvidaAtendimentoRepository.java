package com.inpetu.connect.repository;

import com.inpetu.connect.model.DuvidaAtendimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DuvidaAtendimentoRepository extends JpaRepository<DuvidaAtendimento, Integer> {
    boolean existsByEmailContatoAndMensagemDuvida(String emailContato, String mensagemDuvida);

    @Modifying
    @Query("update DuvidaAtendimento d set d.emailContato = :novoEmail where lower(d.emailContato) = lower(:emailAnterior)")
    int atualizarEmailContato(@Param("emailAnterior") String emailAnterior, @Param("novoEmail") String novoEmail);
}
