package com.inpetu.connect.repository;

import com.inpetu.connect.model.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, Integer> {
    @Query("select count(l) from LogAuditoria l where l.idUsuarioResponsavel = :responsavel and l.acao = 'REDEFINICAO_SENHA' and l.dataHora >= :desde")
    long countRecentPasswordResets(@Param("responsavel") Integer idUsuarioResponsavel,
                                   @Param("desde") LocalDateTime desde);
}
