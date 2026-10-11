package com.inpetu.connect.controller;

import com.inpetu.connect.dto.UsuarioResumo;
import com.inpetu.connect.dto.MotivoExclusaoCadastroRequest;
import com.inpetu.connect.dto.CadastroPublicoRequest;
import com.inpetu.connect.dto.CadastroEdicaoRequest;
import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import com.inpetu.connect.dto.PersonaResumo;

@RestController @RequestMapping("/api/v1/usuarios")
public class UsuarioController {
    private final UsuarioRepository usuarios;
    private final LogAuditoriaRepository auditoria;
    private final OrganizacaoRepository organizacoes;
    private final DuvidaAtendimentoRepository duvidas;
    private final PasswordEncoder passwordEncoder;
    public UsuarioController(UsuarioRepository usuarios, LogAuditoriaRepository auditoria,
            OrganizacaoRepository organizacoes, DuvidaAtendimentoRepository duvidas, PasswordEncoder passwordEncoder) {
        this.usuarios = usuarios;
        this.auditoria = auditoria;
        this.organizacoes = organizacoes;
        this.duvidas = duvidas;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public List<UsuarioResumo> listar() { return usuarios.findAll().stream().map(this::resumo).toList(); }

    @GetMapping("/personas") @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public List<PersonaResumo> personas() {
        return List.of(
                new PersonaResumo(1, "InPETU Hub", null),
                new PersonaResumo(2, "UFSC outros", 30d),
                new PersonaResumo(3, "Ecossistema Sapiens Parque", 20d),
                new PersonaResumo(4, "Governo, ICTs e 3º setor", 10d),
                new PersonaResumo(5, "Outros parceiros do InPETU", 10d),
                new PersonaResumo(6, "Externos", null));
    }

    @PostMapping("/cadastros")
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    @Transactional
    public UsuarioResumo criarCadastro(@Valid @RequestBody CadastroPublicoRequest request, Authentication auth) {
        String email = request.email().trim().toLowerCase();
        if (usuarios.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
        }

        String nomeOrganizacao = request.organizacao().trim();
        Organizacao organizacao = organizacoes.findByNomeOrganizacaoIgnoreCase(nomeOrganizacao).orElseGet(() -> {
            Organizacao nova = new Organizacao();
            nova.setNomeOrganizacao(nomeOrganizacao);
            nova.setTipoOrganizacao("Pendente de classificação");
            return organizacoes.save(nova);
        });
        if (!Boolean.TRUE.equals(organizacao.getAtivo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A organização está inativa. Reative-a antes de criar um cadastro.");
        }

        Usuario usuario = new Usuario();
        usuario.setNomeCompleto(request.nomeCompleto().trim());
        usuario.setEmail(email);
        usuario.setTelefone(request.telefone() == null ? null : request.telefone().trim());
        usuario.setCargoVinculo(request.cargoVinculo().trim());
        usuario.setIdPerfil(4);
        usuario.setSenhaHash(passwordEncoder.encode(request.senha()));
        usuario.setIdOrganizacao(organizacao.getIdOrganizacao());
        usuario.setIdPersona(null);
        usuario.setAtivo(true);
        Usuario criado = usuarios.save(usuario);
        registrar("usuario", criado.getIdUsuario(), "CADASTRO_CRIADO",
            "Cadastro criado pela equipe para " + organizacao.getNomeOrganizacao(), auth.getName());
        return resumo(criado);
    }

    @PutMapping("/{id}/persona")
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    public UsuarioResumo definirPersona(@PathVariable Integer id, @RequestBody Map<String, Integer> body, Authentication auth) {
        Integer persona = body.get("idPersona");
        if (persona == null || persona < 1 || persona > 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A persona deve estar entre P1 e P6.");
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        Integer anterior = usuario.getIdPersona();
        usuario.setIdPersona(persona);
        Usuario salvo = usuarios.save(usuario);
        registrar("usuario", id, "PERSONA_USO",
                "Persona de uso alterada de " + (anterior == null ? "não definida" : "P" + anterior) + " para P" + persona,
                auth.getName());
        return resumo(salvo);
    }

    @PutMapping("/{id}/cadastro")
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS','STAFF')")
    @Transactional
    public UsuarioResumo editarCadastro(@PathVariable Integer id, @Valid @RequestBody CadastroEdicaoRequest request,
            Authentication auth) {
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cadastro não encontrado."));
        if (!Integer.valueOf(4).equals(usuario.getIdPerfil()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Somente cadastros públicos podem ser editados.");

        String email = request.email().trim().toLowerCase();
        usuarios.findByEmailIgnoreCase(email)
                .filter(outro -> !outro.getIdUsuario().equals(id))
                .ifPresent(outro -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
                });

        String nomeOrganizacao = request.organizacao().trim();
        if (usuario.getIdOrganizacao() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este cadastro não possui uma organização vinculada.");
        Organizacao organizacao = organizacoes.findById(usuario.getIdOrganizacao())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "A organização deste cadastro não foi encontrada."));
        organizacoes.findByNomeOrganizacaoIgnoreCase(nomeOrganizacao)
                .filter(outra -> !outra.getIdOrganizacao().equals(organizacao.getIdOrganizacao()))
                .ifPresent(outra -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Já existe outra organização com esse nome. Use o nome cadastrado.");
                });

        String emailAnterior = usuario.getEmail();
        usuario.setNomeCompleto(request.nomeCompleto().trim());
        usuario.setEmail(email);
        usuario.setTelefone(request.telefone() == null || request.telefone().isBlank()
                ? null : request.telefone().trim());
        usuario.setCargoVinculo(request.cargoVinculo().trim());
        organizacao.setNomeOrganizacao(nomeOrganizacao);
        boolean emailAlterado = !emailAnterior.equalsIgnoreCase(email);
        if (emailAlterado) {
            duvidas.atualizarEmailContato(emailAnterior, email);
        }
        usuarios.save(usuario);
        organizacoes.save(organizacao);
        registrar("usuario", id, "ALTERACAO_CADASTRO",
                "Dados cadastrais atualizados: nome, e-mail, telefone, organização e cargo/vínculo."
                        + (emailAlterado ? " E-mails de contato do histórico de dúvidas vinculadas foram atualizados." : ""),
                auth.getName());
        return resumo(usuario);
    }

    @PatchMapping("/{id}/perfil") @PreAuthorize("hasRole('COORDENADOR')")
    public UsuarioResumo alterarPerfil(@PathVariable Integer id, @RequestBody Map<String, Integer> body, Authentication auth) {
        Integer perfil = body.get("idPerfil");
        if (perfil == null || perfil < 1 || perfil > 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O perfil deve ser Coordenador, Gestor de Espaços ou Staff.");
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (usuario.getEmail().equalsIgnoreCase(auth.getName()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O coordenador não pode alterar o próprio perfil de acesso.");
        Integer anterior = usuario.getIdPerfil(); usuario.setIdPerfil(perfil); Usuario salvo = usuarios.save(usuario);
        registrar("usuario", id, "ALTERACAO_PERFIL", "Perfil alterado de " + anterior + " para " + perfil, auth.getName());
        return resumo(salvo);
    }

    @PatchMapping("/{id}/status") @PreAuthorize("hasRole('COORDENADOR')")
    public UsuarioResumo status(@PathVariable Integer id, @RequestBody Map<String, Boolean> body, Authentication auth) {
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        usuario.setAtivo(Boolean.TRUE.equals(body.get("ativo"))); Usuario salvo = usuarios.save(usuario);
        registrar("usuario", id, "ALTERACAO_STATUS", "Ativo: " + salvo.getAtivo(), auth.getName());
        return resumo(salvo);
    }

    @DeleteMapping("/{id}/cadastro") @PreAuthorize("hasRole('COORDENADOR')") @Transactional
    public UsuarioResumo excluirCadastro(@PathVariable Integer id, @Valid @RequestBody MotivoExclusaoCadastroRequest request, Authentication auth) {
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cadastro não encontrado."));
        if (!Integer.valueOf(4).equals(usuario.getIdPerfil()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Somente cadastros públicos podem ser excluídos por esta ação.");
        if (!Boolean.TRUE.equals(usuario.getAtivo()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este cadastro já está inativo.");
        usuario.setAtivo(false);
        Usuario salvo = usuarios.save(usuario);
        registrar("usuario", id, "EXCLUSAO_CADASTRO", request.motivo().trim(), auth.getName());
        return resumo(salvo);
    }

    private UsuarioResumo resumo(Usuario u) {
        return new UsuarioResumo(u.getIdUsuario(), u.getNomeCompleto(), u.getEmail(), u.getTelefone(),
                u.getCargoVinculo(), u.getIdPerfil(), u.getIdOrganizacao(), u.getAtivo(),
                u.getIdPersona(), u.getDataCadastro());
    }
    private void registrar(String tabela, Integer id, String acao, String detalhes, String email) {
        Usuario responsavel = usuarios.findByEmail(email).orElseThrow();
        LogAuditoria log = new LogAuditoria(); log.setTabelaAfetada(tabela); log.setIdRegistroAfetado(id); log.setAcao(acao);
        log.setDetalhesAlteracao(detalhes); log.setIdUsuarioResponsavel(responsavel.getIdUsuario()); log.setDataHora(LocalDateTime.now()); auditoria.save(log);
    }
}
