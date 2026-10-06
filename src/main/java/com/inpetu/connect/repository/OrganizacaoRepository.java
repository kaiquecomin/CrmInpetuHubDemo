package com.inpetu.connect.repository;

import com.inpetu.connect.model.Organizacao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrganizacaoRepository extends JpaRepository<Organizacao, Integer> {
    Optional<Organizacao> findByNomeOrganizacaoIgnoreCase(String nomeOrganizacao);
    List<Organizacao> findByAtivoTrueOrderByNomeOrganizacao();
}
