package com.inpetu.connect.repository;

import com.inpetu.connect.model.CodigoRecuperacaoSenha;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CodigoRecuperacaoSenhaRepository extends JpaRepository<CodigoRecuperacaoSenha, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select codigo from CodigoRecuperacaoSenha codigo where codigo.idUsuario = :idUsuario")
    Optional<CodigoRecuperacaoSenha> findLockedByIdUsuario(@Param("idUsuario") Integer idUsuario);
}
