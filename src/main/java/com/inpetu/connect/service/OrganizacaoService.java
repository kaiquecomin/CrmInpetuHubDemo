package com.inpetu.connect.service;

import com.inpetu.connect.model.*;
import com.inpetu.connect.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrganizacaoService {
    private final OrganizacaoRepository organizacoes;
    private final UsuarioRepository usuarios;
    private final LogAuditoriaRepository auditoria;
    public OrganizacaoService(OrganizacaoRepository organizacoes, UsuarioRepository usuarios, LogAuditoriaRepository auditoria) {
        this.organizacoes = organizacoes; this.usuarios = usuarios; this.auditoria = auditoria;
    }
    @Transactional
    public Organizacao descredenciar(Integer id, String motivo, String email) {
        if (motivo == null || motivo.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O motivo do descredenciamento é obrigatório.");
        Usuario responsavel = usuarios.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Organizacao organizacao = organizacoes.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organização não encontrada."));
        if (!Boolean.TRUE.equals(organizacao.getAtivo())) throw new ResponseStatusException(HttpStatus.CONFLICT, "A organização já está inativa.");
        organizacao.setAtivo(false); organizacao.setMotivoDescredenciamento(motivo.trim());
        organizacao.setDataDescredenciamento(LocalDateTime.now()); organizacao.setIdUsuarioDescredenciou(responsavel.getIdUsuario());
        Organizacao salva = organizacoes.save(organizacao);
        List<Usuario> solicitantes = usuarios.findAllByIdOrganizacaoAndIdPerfilAndAtivoTrue(id, 4);
        solicitantes.forEach(usuario -> usuario.setAtivo(false));
        usuarios.saveAll(solicitantes);
        LogAuditoria log = new LogAuditoria(); log.setTabelaAfetada("organizacao"); log.setIdRegistroAfetado(id);
        log.setAcao("DESCREDENCIAMENTO"); log.setDetalhesAlteracao(motivo.trim() + " | Acessos públicos desativados: " + solicitantes.size());
        log.setIdUsuarioResponsavel(responsavel.getIdUsuario()); log.setDataHora(LocalDateTime.now()); auditoria.save(log);
        return salva;
    }
}
