package com.inpetu.connect.controller;

import com.inpetu.connect.dto.UsuarioResumo;
import com.inpetu.connect.dto.MotivoExclusaoCadastroRequest;
import com.inpetu.connect.dto.CadastroPublicoRequest;
import com.inpetu.connect.dto.CadastroEdicaoRequest;
import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.model.UsuarioFoto;
import com.inpetu.connect.repository.LogAuditoriaRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import com.inpetu.connect.repository.UsuarioFotoRepository;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import com.inpetu.connect.dto.PerfilUsuarioRequest;
import com.inpetu.connect.dto.AlterarSenhaRequest;
import com.inpetu.connect.dto.RedefinirSenhaRequest;
import com.inpetu.connect.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletResponse;
import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Iterator;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.security.SecureRandom;
import com.inpetu.connect.dto.PersonaResumo;

@RestController @RequestMapping("/api/v1/usuarios")
public class UsuarioController {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String SENHA_TEMPORARIA_ALFABETO =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private final UsuarioRepository usuarios;
    private final LogAuditoriaRepository auditoria;
    private final OrganizacaoRepository organizacoes;
    private final DuvidaAtendimentoRepository duvidas;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioFotoRepository fotos;
    private final JwtService jwt;
    private final UserDetailsService userDetailsService;
    public UsuarioController(UsuarioRepository usuarios, LogAuditoriaRepository auditoria,
            OrganizacaoRepository organizacoes, DuvidaAtendimentoRepository duvidas, PasswordEncoder passwordEncoder,
            UsuarioFotoRepository fotos, JwtService jwt, UserDetailsService userDetailsService) {
        this.usuarios = usuarios;
        this.auditoria = auditoria;
        this.organizacoes = organizacoes;
        this.duvidas = duvidas;
        this.passwordEncoder = passwordEncoder;
        this.fotos = fotos;
        this.jwt = jwt;
        this.userDetailsService = userDetailsService;
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public Map<String, Object> meuPerfil(Authentication auth) {
        Usuario usuario = usuarioAutenticado(auth);
        Organizacao organizacao = usuario.getIdOrganizacao() == null ? null
                : organizacoes.findById(usuario.getIdOrganizacao()).orElse(null);
        UsuarioFoto foto = fotos.findById(usuario.getIdUsuario()).orElse(null);
        return Map.of(
                "idUsuario", usuario.getIdUsuario(),
                "nomeCompleto", usuario.getNomeCompleto(),
                "email", usuario.getEmail(),
                "telefone", usuario.getTelefone() == null ? "" : usuario.getTelefone(),
                "cargoVinculo", usuario.getCargoVinculo() == null ? "" : usuario.getCargoVinculo(),
                "organizacao", organizacao == null ? "" : organizacao.getNomeOrganizacao(),
                "perfil", usuario.getIdPerfil(),
                "senhaTemporaria", Boolean.TRUE.equals(usuario.getSenhaTemporaria()),
                "temFoto", foto != null,
                "fotoVersao", foto == null ? 0L : foto.getAtualizadaEm().toInstant(ZoneOffset.UTC).toEpochMilli());
    }

    @PutMapping("/me")
    @Transactional
    public Map<String, Object> atualizarMeuPerfil(@Valid @RequestBody PerfilUsuarioRequest request, Authentication auth) {
        Usuario usuario = usuarioAutenticado(auth);
        usuario.setNomeCompleto(request.nomeCompleto().trim());
        usuario.setTelefone(request.telefone() == null || request.telefone().isBlank() ? null : request.telefone().trim());
        usuario.setCargoVinculo(request.cargoVinculo().trim());
        if (Integer.valueOf(4).equals(usuario.getIdPerfil()) && usuario.getIdOrganizacao() != null) {
            Organizacao atual = organizacoes.findById(usuario.getIdOrganizacao())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "A organização vinculada ao seu perfil não foi encontrada."));
            String nomeOrganizacao = request.organizacao().trim();
            if (!atual.getNomeOrganizacao().equalsIgnoreCase(nomeOrganizacao)) {
                Organizacao destino = organizacoes.findByNomeOrganizacaoIgnoreCase(nomeOrganizacao)
                        .orElseGet(() -> {
                            Organizacao nova = new Organizacao();
                            nova.setNomeOrganizacao(nomeOrganizacao);
                            nova.setTipoOrganizacao("Pendente de classificação");
                            return organizacoes.save(nova);
                        });
                if (Boolean.FALSE.equals(destino.getAtivo())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "A organização informada não está ativa.");
                }
                usuario.setIdOrganizacao(destino.getIdOrganizacao());
            }
        }
        registrar("usuario", usuario.getIdUsuario(), "ALTERACAO_PERFIL_PROPRIO",
                "Dados do perfil atualizados.", auth.getName());
        return meuPerfil(auth);
    }

    @PostMapping(value = "/me/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<Map<String, Object>> atualizarMinhaFoto(
            @RequestParam("foto") MultipartFile arquivo, Authentication auth) {
        if (arquivo.isEmpty() || arquivo.getSize() > 2L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A foto deve ter conteúdo e até 2 MB.");
        }
        Usuario usuario = usuarioAutenticado(auth);
        BufferedImage original = lerImagemValidada(arquivo);
        int side = Math.min(original.getWidth(), original.getHeight());
        int x = (original.getWidth() - side) / 2;
        int y = (original.getHeight() - side) / 2;
        BufferedImage quadrada = new BufferedImage(256, 256, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = quadrada.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.drawImage(original, 0, 0, 256, 256, x, y, x + side, y + side, null);
        graphics.dispose();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (!ImageIO.write(quadrada, "jpeg", output)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível processar esta foto.");
            }
            UsuarioFoto foto = fotos.findById(usuario.getIdUsuario()).orElseGet(UsuarioFoto::new);
            foto.setIdUsuario(usuario.getIdUsuario());
            foto.setConteudo(output.toByteArray());
            foto.setTipoConteudo(MediaType.IMAGE_JPEG_VALUE);
            foto.setAtualizadaEm(LocalDateTime.now());
            fotos.save(foto);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível salvar a foto.");
        }
        registrar("usuario_foto", usuario.getIdUsuario(), "ATUALIZACAO_FOTO",
                "Foto de perfil atualizada.", auth.getName());
        UsuarioFoto salva = fotos.findById(usuario.getIdUsuario()).orElseThrow();
        return ResponseEntity.ok(Map.of("temFoto", true,
                "fotoVersao", salva.getAtualizadaEm().toInstant(ZoneOffset.UTC).toEpochMilli()));
    }

    @GetMapping("/me/foto")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> minhaFoto(Authentication auth,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        Usuario usuario = usuarioAutenticado(auth);
        return respostaFoto(usuario.getIdUsuario(), ifNoneMatch);
    }

    @GetMapping("/{id}/foto")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> fotoCadastro(@PathVariable Integer id, Authentication auth,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        Usuario solicitante = usuarioAutenticado(auth);
        if (!id.equals(solicitante.getIdUsuario())) {
            Usuario cadastro = usuarios.findById(id)
                    .filter(usuario -> Integer.valueOf(4).equals(usuario.getIdPerfil()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Foto de perfil não encontrada."));
            if (solicitante.getIdPerfil() == null || solicitante.getIdPerfil() >= 4) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto de perfil não encontrada.");
            }
        }
        return respostaFoto(id, ifNoneMatch);
    }

    private ResponseEntity<byte[]> respostaFoto(Integer idUsuario, String ifNoneMatch) {
        UsuarioFoto foto = fotos.findById(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto de perfil não encontrada."));
        String etag = "\"" + Base64.getUrlEncoder().withoutPadding().encodeToString(
                digestSha256(foto.getConteudo())) + "\"";
        if (etag.equals(ifNoneMatch)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag)
                    .cacheControl(CacheControl.noCache().cachePrivate()).build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(foto.getTipoConteudo()))
                .eTag(etag)
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePrivate())
                .body(foto.getConteudo());
    }

    @DeleteMapping("/me/foto")
    @Transactional
    public ResponseEntity<Map<String, Object>> removerMinhaFoto(Authentication auth) {
        Usuario usuario = usuarioAutenticado(auth);
        if (fotos.existsById(usuario.getIdUsuario())) {
            fotos.deleteById(usuario.getIdUsuario());
            registrar("usuario_foto", usuario.getIdUsuario(), "REMOCAO_FOTO",
                    "Foto de perfil removida.", auth.getName());
        }
        return ResponseEntity.ok(Map.of("temFoto", false, "fotoVersao", System.currentTimeMillis()));
    }

    @PutMapping("/me/senha")
    @Transactional
    public ResponseEntity<Void> alterarMinhaSenha(@Valid @RequestBody AlterarSenhaRequest request, Authentication auth,
            HttpServletResponse response) {
        Usuario usuario = usuarioAutenticado(auth);
        if (!passwordEncoder.matches(request.senhaAtual(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha atual está incorreta.");
        }
        if (!request.novaSenha().equals(request.confirmarSenha())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A confirmação da nova senha não confere.");
        }
        if (passwordEncoder.matches(request.novaSenha(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ser diferente da senha atual.");
        }
        usuario.setSenhaHash(passwordEncoder.encode(request.novaSenha()));
        usuario.setSenhaTemporaria(false);
        usuario.setVersaoToken((usuario.getVersaoToken() == null ? 0 : usuario.getVersaoToken()) + 1);
        registrar("usuario", usuario.getIdUsuario(), "ALTERACAO_SENHA",
                "Senha alterada pelo próprio usuário.", auth.getName());
        var principal = userDetailsService.loadUserByUsername(usuario.getEmail());
        String token = jwt.gerar(principal, usuario.getVersaoToken());
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("inpetu-token", token)
                .httpOnly(true).secure(true).sameSite("Strict").path("/api/v1")
                .maxAge(java.time.Duration.ofMillis(jwt.expirationMs())).build().toString());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/redefinir-senha")
    @PreAuthorize("hasRole('COORDENADOR')")
    @Transactional
    public Map<String, String> redefinirSenha(@PathVariable Integer id,
            @Valid @RequestBody RedefinirSenhaRequest request, Authentication auth) {
        Usuario responsavel = usuarioAutenticado(auth);
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (usuario.getIdUsuario().equals(responsavel.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Use a opção de alteração do próprio perfil para mudar sua senha.");
        }
        if (usuario.getIdPerfil() < responsavel.getIdPerfil()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Não é permitido redefinir a senha de um perfil superior.");
        }
        if (auditoria.countRecentPasswordResets(responsavel.getIdUsuario(), LocalDateTime.now().minusHours(1)) >= 5) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Limite de redefinições atingido. Tente novamente mais tarde.");
        }
        boolean generate = !Boolean.FALSE.equals(request.gerarAutomaticamente());
        String temporaryPassword = generate ? gerarSenhaTemporaria() : request.senhaTemporaria();
        if (temporaryPassword == null || temporaryPassword.length() < 8 || temporaryPassword.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A senha temporária deve ter entre 8 e 64 caracteres.");
        }
        usuario.setSenhaHash(passwordEncoder.encode(temporaryPassword));
        usuario.setSenhaTemporaria(true);
        usuario.setVersaoToken((usuario.getVersaoToken() == null ? 0 : usuario.getVersaoToken()) + 1);
        registrar("usuario", id, "REDEFINICAO_SENHA",
                "Senha temporária definida pela equipe.", auth.getName());
        return Map.of("senhaTemporaria", temporaryPassword, "geradaAutomaticamente", Boolean.toString(generate));
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
        UsuarioFoto foto = fotos.findById(u.getIdUsuario()).orElse(null);
        return new UsuarioResumo(u.getIdUsuario(), u.getNomeCompleto(), u.getEmail(), u.getTelefone(),
                u.getCargoVinculo(), u.getIdPerfil(), u.getIdOrganizacao(), u.getAtivo(),
                u.getIdPersona(), u.getDataCadastro(), foto != null,
                foto == null ? 0L : foto.getAtualizadaEm().toInstant(ZoneOffset.UTC).toEpochMilli());
    }
    private Usuario usuarioAutenticado(Authentication auth) {
        return usuarios.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário autenticado não encontrado."));
    }

    private BufferedImage lerImagemValidada(MultipartFile arquivo) {
        try (ByteArrayInputStream input = new ByteArrayInputStream(arquivo.getBytes());
                var imageInput = ImageIO.createImageInputStream(input)) {
            Iterator<javax.imageio.ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) throw new IllegalArgumentException();
            javax.imageio.ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                if (!List.of("jpeg", "jpg", "png", "webp").contains(format)) throw new IllegalArgumentException();
                reader.setInput(imageInput, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 8000 || height > 8000
                        || (long) width * height > 20_000_000L) throw new IllegalArgumentException();
                BufferedImage image = reader.read(0);
                if (image == null) throw new IllegalArgumentException();
                return image;
            } finally {
                reader.dispose();
            }
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A foto deve ser uma imagem JPG, PNG ou WebP válida.");
        }
    }

    private byte[] digestSha256(byte[] content) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(content);
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível gerar o ETag da foto.", ex);
        }
    }

    private String gerarSenhaTemporaria() {
        StringBuilder password = new StringBuilder(12);
        for (int index = 0; index < 12; index++) {
            password.append(SENHA_TEMPORARIA_ALFABETO.charAt(SECURE_RANDOM.nextInt(SENHA_TEMPORARIA_ALFABETO.length())));
        }
        return password.toString();
    }
    private void registrar(String tabela, Integer id, String acao, String detalhes, String email) {
        Usuario responsavel = usuarios.findByEmail(email).orElseThrow();
        LogAuditoria log = new LogAuditoria(); log.setTabelaAfetada(tabela); log.setIdRegistroAfetado(id); log.setAcao(acao);
        log.setDetalhesAlteracao(detalhes); log.setIdUsuarioResponsavel(responsavel.getIdUsuario()); log.setDataHora(LocalDateTime.now()); auditoria.save(log);
    }
}
