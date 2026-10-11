package com.inpetu.connect.repository;

import com.inpetu.connect.model.CadastroPendente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CadastroPendenteRepository extends JpaRepository<CadastroPendente, Integer> {
    Optional<CadastroPendente> findByEmailIgnoreCase(String email);
    Optional<CadastroPendente> findByTokenHash(String tokenHash);
    List<CadastroPendente> findByExpiraEmBefore(LocalDateTime dateTime);
}
