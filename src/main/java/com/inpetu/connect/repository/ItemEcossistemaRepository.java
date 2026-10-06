package com.inpetu.connect.repository;

import com.inpetu.connect.model.ItemEcossistema;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemEcossistemaRepository extends JpaRepository<ItemEcossistema, Integer> {
    List<ItemEcossistema> findAllByAtivoTrueOrderByOrdemAscIdItemEcossistemaAsc();
    List<ItemEcossistema> findAllByOrderByOrdemAscIdItemEcossistemaAsc();
}
