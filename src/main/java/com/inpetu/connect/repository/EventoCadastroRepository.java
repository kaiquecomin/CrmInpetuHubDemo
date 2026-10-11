package com.inpetu.connect.repository;

import com.inpetu.connect.model.EventoCadastro;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EventoCadastroRepository extends JpaRepository<EventoCadastro, Integer> {
    long countByIpHashAndCriadoEmAfter(String ipHash, LocalDateTime after);
    long countByEmailHashAndCriadoEmAfter(String emailHash, LocalDateTime after);
    List<EventoCadastro> findByCriadoEmBefore(LocalDateTime before);
}
