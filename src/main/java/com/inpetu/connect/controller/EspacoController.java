package com.inpetu.connect.controller;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.model.EspacoFoto;
import com.inpetu.connect.model.LogAuditoria;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.dto.EspacoStatusRequest;
import com.inpetu.connect.dto.EspacoCriacaoRequest;
import com.inpetu.connect.repository.*;
import com.inpetu.connect.service.ImageUploadService;
import com.inpetu.connect.service.ImageUploadService.StoredImage;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.nio.file.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/espacos")
public class EspacoController {
    private final EspacoRepository espacos;
    private final ReservaRepository reservas;
    private final EspacoFotoRepository fotos;
    private final LogAuditoriaRepository auditoria;
    private final UsuarioRepository usuarios;
    private final Path imageDirectory;
    public EspacoController(
        EspacoRepository espacos,
        ReservaRepository reservas,
        EspacoFotoRepository fotos,
        LogAuditoriaRepository auditoria,
        UsuarioRepository usuarios,
        @Value("${app.upload.dir:uploads/inpetu}") String uploadDirectory
    ) {
        this.espacos = espacos;
        this.reservas = reservas;
        this.fotos = fotos;
        this.auditoria = auditoria;
        this.usuarios = usuarios;
        this.imageDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize().resolve("espacos");
    }
    @GetMapping public List<Espaco> listar() { return espacos.findAllByOrderByNomeEspaco(); }
    @GetMapping("/{id}/imagem")
    public ResponseEntity<Resource> obterImagem(@PathVariable Integer id) {
        Espaco espaco = buscar(id);
        if (espaco.getArquivoImagem() == null || espaco.getTipoImagem() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este espaço não possui imagem.");
        }
        return respostaImagem(espaco.getArquivoImagem(), espaco.getTipoImagem());
    }
    @GetMapping("/{id}/agenda") public List<?> agenda(@PathVariable Integer id, @RequestParam LocalDate data) {
        return reservas.findByIdEspacoAndDataReservaOrderByHorarioInicio(id, data).stream()
            .filter(r -> !"Cancelada".equals(r.getStatusReserva()))
            .map(r -> Map.of(
                "inicio", r.getHorarioInicio(),
                "fim", r.getHorarioFim(),
                "status", r.getStatusReserva(),
                "statusReserva", r.getStatusReserva()
            )).toList();
    }
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    public Espaco criarJson(@Valid @RequestBody EspacoCriacaoRequest request) {
        validarDados(request.nomeEspaco(), request.tipoEspaco(), request.capacidadePessoas());
        Espaco espaco = new Espaco();
        espaco.setNomeEspaco(request.nomeEspaco().trim());
        espaco.setTipoEspaco(request.tipoEspaco().trim());
        espaco.setCapacidadePessoas(request.capacidadePessoas());
        espaco.setEquipamentosDisponiveis(normalizarTexto(request.equipamentosDisponiveis()));
        espaco.setDescricao(normalizarTexto(request.descricao()));
        espaco.setExigeAprovacaoManual(request.exigeAprovacaoManual());
        espaco.setAtivo(true);
        return espacos.save(espaco);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    public Espaco criar(
        @RequestParam String nomeEspaco,
        @RequestParam String tipoEspaco,
        @RequestParam Integer capacidadePessoas,
        @RequestParam(required = false) String equipamentosDisponiveis,
        @RequestPart(value = "imagem", required = false) MultipartFile imagem
    ) {
        validarDados(nomeEspaco, tipoEspaco, capacidadePessoas);
        Espaco espaco = new Espaco();
        espaco.setNomeEspaco(nomeEspaco.trim());
        espaco.setTipoEspaco(tipoEspaco.trim());
        espaco.setCapacidadePessoas(capacidadePessoas);
        espaco.setEquipamentosDisponiveis(equipamentosDisponiveis == null || equipamentosDisponiveis.isBlank() ? null : equipamentosDisponiveis.trim());
        espaco.setExigeAprovacaoManual("visita guiada".equalsIgnoreCase(tipoEspaco.trim()));
        espaco.setAtivo(true);
        salvarImagem(espaco, imagem);
        try {
            return espacos.save(espaco);
        } catch (RuntimeException ex) {
            apagarImagem(espaco.getArquivoImagem());
            throw ex;
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    @Transactional
    public Espaco atualizar(
        @PathVariable Integer id,
        @RequestParam String nomeEspaco,
        @RequestParam String tipoEspaco,
        @RequestParam Integer capacidadePessoas,
        @RequestParam(required = false) String equipamentosDisponiveis,
        @RequestParam(required = false) String descricao,
        @RequestParam(defaultValue = "false") Boolean exigeAprovacaoManual,
        @RequestPart(value = "imagem", required = false) MultipartFile imagem,
        Authentication authentication
    ) {
        validarDados(nomeEspaco, tipoEspaco, capacidadePessoas);
        validarTextoOpcional(equipamentosDisponiveis, "Os equipamentos devem ter até 2000 caracteres.");
        validarTextoOpcional(descricao, "A descrição deve ter até 2000 caracteres.");

        Espaco espaco = buscar(id);
        String imagemAnterior = espaco.getArquivoImagem();
        espaco.setNomeEspaco(nomeEspaco.trim());
        espaco.setTipoEspaco(tipoEspaco.trim());
        espaco.setCapacidadePessoas(capacidadePessoas);
        espaco.setEquipamentosDisponiveis(normalizarTexto(equipamentosDisponiveis));
        espaco.setDescricao(normalizarTexto(descricao));
        espaco.setExigeAprovacaoManual(Boolean.TRUE.equals(exigeAprovacaoManual));
        salvarImagem(espaco, imagem);

        try {
            Espaco atualizado = espacos.save(espaco);
            registrarAuditoria(authentication, id, "EDICAO_ESPACO",
                "Dados do espaço atualizados: " + atualizado.getNomeEspaco() + ".");
            apagarImagemSeNaoEstaEmUso(imagemAnterior, atualizado.getArquivoImagem());
            return atualizado;
        } catch (RuntimeException ex) {
            if (imagem != null && !imagem.isEmpty() && !Objects.equals(imagemAnterior, espaco.getArquivoImagem())) {
                apagarImagem(espaco.getArquivoImagem());
            }
            throw ex;
        }
    }

    @GetMapping("/{id}/fotos")
    public List<EspacoFoto> listarFotos(@PathVariable Integer id) {
        buscar(id);
        return fotos.findAllByIdEspacoOrderByOrdemAscIdEspacoFotoAsc(id);
    }

    @GetMapping("/{id}/fotos/{fotoId}/imagem")
    public ResponseEntity<Resource> obterFoto(@PathVariable Integer id, @PathVariable Integer fotoId) {
        buscar(id);
        EspacoFoto foto = buscarFoto(id, fotoId);
        return respostaImagem(foto.getArquivo(), foto.getTipoImagem());
    }

    @PostMapping(value = "/{id}/fotos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    @Transactional
    public EspacoFoto adicionarFoto(
        @PathVariable Integer id,
        @RequestPart("imagem") MultipartFile imagem,
        @RequestParam(required = false) String legenda,
        Authentication authentication
    ) {
        Espaco espaco = buscar(id);
        validarTextoOpcional(legenda, "A legenda deve ter até 200 caracteres.", 200);
        if (imagem == null || imagem.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma imagem para adicionar.");
        }
        StoredImage imagemArmazenada = ImageUploadService.store(imagem, imageDirectory);
        String arquivo = imagemArmazenada.fileName();
        String tipoImagem = imagemArmazenada.contentType();
        List<EspacoFoto> atuais = fotos.findAllByIdEspacoOrderByOrdemAscIdEspacoFotoAsc(id);

        EspacoFoto foto = new EspacoFoto();
        foto.setIdEspaco(id);
        foto.setArquivo(arquivo);
        foto.setTipoImagem(tipoImagem);
        foto.setLegenda(normalizarTexto(legenda));
        foto.setOrdem(atuais.size());
        try {
            EspacoFoto salva = fotos.save(foto);
            if (espaco.getArquivoImagem() == null || espaco.getArquivoImagem().isBlank()) {
                espaco.setArquivoImagem(arquivo);
                espaco.setTipoImagem(tipoImagem);
                espacos.save(espaco);
            }
            registrarAuditoria(authentication, id, "ADICAO_FOTO_ESPACO",
                "Foto adicionada ao espaço " + espaco.getNomeEspaco() + ".");
            return salva;
        } catch (RuntimeException ex) {
            apagarImagem(arquivo);
            throw ex;
        }
    }

    @DeleteMapping("/{id}/fotos/{fotoId}")
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    @Transactional
    public ResponseEntity<Void> removerFoto(
        @PathVariable Integer id,
        @PathVariable Integer fotoId,
        Authentication authentication
    ) {
        Espaco espaco = buscar(id);
        EspacoFoto foto = buscarFoto(id, fotoId);
        List<EspacoFoto> restantes = fotos.findAllByIdEspacoOrderByOrdemAscIdEspacoFotoAsc(id).stream()
            .filter(item -> !item.getIdEspacoFoto().equals(fotoId))
            .toList();
        fotos.delete(foto);
        if (Objects.equals(espaco.getArquivoImagem(), foto.getArquivo())) {
            EspacoFoto proximaCapa = restantes.stream().findFirst().orElse(null);
            espaco.setArquivoImagem(proximaCapa == null ? null : proximaCapa.getArquivo());
            espaco.setTipoImagem(proximaCapa == null ? null : proximaCapa.getTipoImagem());
            espacos.save(espaco);
        }
        registrarAuditoria(authentication, id, "REMOCAO_FOTO_ESPACO",
            "Foto removida do espaço " + espaco.getNomeEspaco() + ".");
        apagarImagemSeNaoEstaEmUso(foto.getArquivo(), espaco.getArquivoImagem());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/fotos/{fotoId}/capa")
    @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    @Transactional
    public Espaco definirCapa(
        @PathVariable Integer id,
        @PathVariable Integer fotoId,
        Authentication authentication
    ) {
        Espaco espaco = buscar(id);
        EspacoFoto foto = buscarFoto(id, fotoId);
        String imagemAnterior = espaco.getArquivoImagem();
        espaco.setArquivoImagem(foto.getArquivo());
        espaco.setTipoImagem(foto.getTipoImagem());
        Espaco atualizado = espacos.save(espaco);
        registrarAuditoria(authentication, id, "DEFINICAO_CAPA_ESPACO",
            "Capa do espaço " + espaco.getNomeEspaco() + " alterada.");
        apagarImagemSeNaoEstaEmUso(imagemAnterior, atualizado.getArquivoImagem());
        return atualizado;
    }

    @PatchMapping("/{id}/status") @PreAuthorize("hasAnyRole('COORDENADOR','GESTOR_ESPACOS')")
    public Espaco status(@PathVariable Integer id, @Valid @RequestBody EspacoStatusRequest body) {
        Espaco espaco = espacos.findById(Objects.requireNonNull(id, "O identificador do espaço é obrigatório"))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaço não encontrado."));
        if (!Boolean.TRUE.equals(body.ativo()) && (body.motivoIndisponibilidade() == null || body.motivoIndisponibilidade().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o motivo da indisponibilidade.");
        espaco.setAtivo(Boolean.TRUE.equals(body.ativo()));
        espaco.setMotivoIndisponibilidade(espaco.getAtivo() ? null : body.motivoIndisponibilidade().trim());
        espaco.setDataPrevisaoRetorno(espaco.getAtivo() ? null : body.dataPrevisaoRetorno());
        return espacos.save(espaco);
    }

    private Espaco buscar(Integer id) {
        return espacos.findById(Objects.requireNonNull(id, "O identificador do espaço é obrigatório"))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaço não encontrado."));
    }

    private void validarDados(String nome, String tipo, Integer capacidade) {
        if (nome == null || nome.isBlank() || nome.trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome do espaço (até 100 caracteres).");
        }
        if (tipo == null || tipo.isBlank() || tipo.trim().length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o tipo do espaço (até 50 caracteres).");
        }
        if (capacidade == null || capacidade < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A capacidade deve ser de pelo menos uma pessoa.");
        }
    }

    private void salvarImagem(Espaco espaco, MultipartFile imagem) {
        if (imagem == null || imagem.isEmpty()) return;
        StoredImage imagemArmazenada = ImageUploadService.store(imagem, imageDirectory);
        espaco.setArquivoImagem(imagemArmazenada.fileName());
        espaco.setTipoImagem(imagemArmazenada.contentType());
    }

    private String salvarImagem(MultipartFile imagem) {
        if (imagem == null || imagem.isEmpty()) return null;
        return ImageUploadService.store(imagem, imageDirectory).fileName();
    }

    private ResponseEntity<Resource> respostaImagem(String nomeArquivo, String tipoImagem) {
        Path arquivo = ImageUploadService.resolve(imageDirectory, nomeArquivo);
        Resource imagem = Files.isRegularFile(arquivo) && arquivo.getParent().equals(imageDirectory)
            ? new FileSystemResource(arquivo)
            : new ClassPathResource("static/images/rooms/" + nomeArquivo);
        if (!imagem.isReadable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagem do espaço não encontrada.");
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(Objects.requireNonNull(tipoImagem)))
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
            .body(imagem);
    }

    private EspacoFoto buscarFoto(Integer id, Integer fotoId) {
        return fotos.findByIdEspacoAndIdEspacoFoto(id, fotoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto do espaço não encontrada."));
    }

    private void validarTextoOpcional(String texto, String mensagem) {
        validarTextoOpcional(texto, mensagem, 2000);
    }

    private void validarTextoOpcional(String texto, String mensagem, int limite) {
        if (texto != null && texto.trim().length() > limite) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
        }
    }

    private String normalizarTexto(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    private void registrarAuditoria(Authentication authentication, Integer idEspaco, String acao, String detalhes) {
        Usuario usuario = usuarios.findByEmail(authentication.getName())
            .orElseThrow(() -> new IllegalStateException("Não foi possível identificar o usuário responsável pela alteração."));
        LogAuditoria registro = new LogAuditoria();
        registro.setTabelaAfetada("espaco");
        registro.setIdRegistroAfetado(idEspaco);
        registro.setAcao(acao);
        registro.setDetalhesAlteracao(detalhes);
        registro.setIdUsuarioResponsavel(usuario.getIdUsuario());
        auditoria.save(registro);
    }

    private void apagarImagemSeNaoEstaEmUso(String nomeArquivo, String imagemPreservada) {
        if (nomeArquivo != null && !Objects.equals(nomeArquivo, imagemPreservada) && !fotos.existsByArquivo(nomeArquivo)) {
            apagarImagem(nomeArquivo);
        }
    }

    private void apagarImagem(String nomeArquivo) {
        ImageUploadService.delete(imageDirectory, nomeArquivo);
    }
}
