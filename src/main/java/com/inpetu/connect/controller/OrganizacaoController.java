package com.inpetu.connect.controller;

import com.inpetu.connect.dto.DescredenciarRequest;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.service.OrganizacaoService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/organizacoes")
public class OrganizacaoController {
    private final OrganizacaoRepository organizacoes; private final OrganizacaoService service;
    public OrganizacaoController(OrganizacaoRepository organizacoes, OrganizacaoService service) { this.organizacoes = organizacoes; this.service = service; }
    @GetMapping @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')") public List<Organizacao> listar() { return organizacoes.findAll(); }
    @DeleteMapping("/{id}/descredenciar") @PreAuthorize("hasRole('COORDENADOR')")
    public Organizacao descredenciar(@PathVariable Integer id, @Valid @RequestBody DescredenciarRequest request, Authentication auth) {
        return service.descredenciar(id, request.motivoDescredenciamento(), auth.getName());
    }
}
