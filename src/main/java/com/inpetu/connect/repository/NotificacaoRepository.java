package com.inpetu.connect.repository;

import com.inpetu.connect.model.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Integer> {
    List<Notificacao> findByIdUsuarioDestinatarioOrderByDataHoraDesc(Integer idUsuarioDestinatario);
    List<Notificacao> findByIdUsuarioDestinatarioAndLidaFalse(Integer idUsuarioDestinatario);
    Optional<Notificacao> findByIdNotificacaoAndIdUsuarioDestinatario(Integer idNotificacao, Integer idUsuarioDestinatario);
}
