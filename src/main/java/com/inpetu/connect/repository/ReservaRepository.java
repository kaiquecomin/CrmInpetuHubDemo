package com.inpetu.connect.repository;

import com.inpetu.connect.model.Reserva;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Collection;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {
    long countByStatusReserva(String statusReserva);

    @Query("select (count(r) > 0) from Reserva r where r.idEspaco = :espaco and r.dataReserva = :data and r.statusReserva in ('Confirmada', 'Pendente') and r.horarioInicio < :fim and r.horarioFim > :inicio")
    boolean existeConflito(@Param("espaco") Integer espaco, @Param("data") LocalDate data,
            @Param("inicio") LocalTime inicio, @Param("fim") LocalTime fim);

    @Query("select (count(r) > 0) from Reserva r where r.idEspaco = :espaco and r.idReserva <> :reserva and r.dataReserva = :data and r.statusReserva in ('Confirmada', 'Pendente') and r.horarioInicio < :fim and r.horarioFim > :inicio and (r.dataSolicitacao < :solicitacao or (r.dataSolicitacao = :solicitacao and r.idReserva < :reserva))")
    boolean existeReservaAnteriorConflitante(@Param("espaco") Integer espaco, @Param("reserva") Integer reserva,
            @Param("data") LocalDate data, @Param("inicio") LocalTime inicio, @Param("fim") LocalTime fim,
            @Param("solicitacao") java.time.LocalDateTime solicitacao);

    @Query("select (count(r) > 0) from Reserva r where r.idEspaco = :espaco and r.idReserva <> :reserva and r.dataReserva = :data and r.statusReserva in ('Confirmada', 'Pendente') and r.horarioInicio < :fim and r.horarioFim > :inicio")
    boolean existeConflitoParaAtualizacao(@Param("espaco") Integer espaco, @Param("reserva") Integer reserva,
            @Param("data") LocalDate data, @Param("inicio") LocalTime inicio, @Param("fim") LocalTime fim);

    List<Reserva> findByIdSolicitanteAndDataReservaBetweenAndStatusReservaIn(
            Integer idSolicitante, LocalDate inicio, LocalDate fim, Collection<String> statusReserva);

    List<Reserva> findByIdSolicitanteOrderByDataReservaDesc(Integer idSolicitante);
    java.util.Optional<Reserva> findByTituloEventoAndIdSolicitante(String tituloEvento, Integer idSolicitante);

    List<Reserva> findByDataReservaAndStatusReservaIn(LocalDate dataReserva, List<String> statusReserva);

    List<Reserva> findByIdEspacoAndDataReservaOrderByHorarioInicio(Integer idEspaco, LocalDate dataReserva);

    boolean existsByTituloEventoAndIdSolicitante(String tituloEvento, Integer idSolicitante);
}
