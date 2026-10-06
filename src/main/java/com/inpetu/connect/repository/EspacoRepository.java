package com.inpetu.connect.repository;

import com.inpetu.connect.model.Espaco;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface EspacoRepository extends JpaRepository<Espaco, Integer> {
    List<Espaco> findByAtivoTrueOrderByNomeEspaco();
    List<Espaco> findAllByOrderByNomeEspaco();
    Optional<Espaco> findByNomeEspacoIgnoreCase(String nomeEspaco);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Espaco e where e.idEspaco = :id")
    Optional<Espaco> bloquearParaReserva(@Param("id") Integer id);
}
