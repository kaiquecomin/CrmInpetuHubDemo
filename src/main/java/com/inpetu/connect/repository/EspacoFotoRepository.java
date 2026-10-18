package com.inpetu.connect.repository;

import com.inpetu.connect.model.EspacoFoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EspacoFotoRepository extends JpaRepository<EspacoFoto, Integer> {
    List<EspacoFoto> findAllByIdEspacoOrderByOrdemAscIdEspacoFotoAsc(Integer idEspaco);

    Optional<EspacoFoto> findByIdEspacoAndIdEspacoFoto(Integer idEspaco, Integer idEspacoFoto);

    boolean existsByArquivo(String arquivo);
}
