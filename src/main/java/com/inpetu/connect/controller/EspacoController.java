package com.inpetu.connect.controller;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.dto.EspacoStatusRequest;
import com.inpetu.connect.repository.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.nio.file.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/espacos")
public class EspacoController {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_IMAGE_PIXELS = 16_000_000;
    private final EspacoRepository espacos; private final ReservaRepository reservas;
    private final Path imageDirectory;
    public EspacoController(
        EspacoRepository espacos,
        ReservaRepository reservas,
        @Value("${app.upload.dir:uploads/inpetu}") String uploadDirectory
    ) {
        this.espacos = espacos;
        this.reservas = reservas;
        this.imageDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize().resolve("espacos");
    }
    @GetMapping public List<Espaco> listar() { return espacos.findAllByOrderByNomeEspaco(); }
    @GetMapping("/{id}/imagem")
    public ResponseEntity<Resource> obterImagem(@PathVariable Integer id) {
        Espaco espaco = buscar(id);
        if (espaco.getArquivoImagem() == null || espaco.getTipoImagem() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este espaço não possui imagem.");
        }
        String nomeArquivo = espaco.getArquivoImagem();
        Path caminhoNome = Path.of(nomeArquivo);
        if (caminhoNome.getNameCount() != 1 || !caminhoNome.getFileName().toString().equals(nomeArquivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagem do espaço não encontrada.");
        }
        Path arquivo = imageDirectory.resolve(nomeArquivo).normalize();
        Resource imagem = Files.isRegularFile(arquivo) && arquivo.getParent().equals(imageDirectory)
            ? new FileSystemResource(arquivo)
            : new ClassPathResource("static/images/rooms/" + nomeArquivo);
        if (!imagem.isReadable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagem do espaço não encontrada.");
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(Objects.requireNonNull(espaco.getTipoImagem())))
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
            .body(imagem);
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
    public Espaco criarJson(@RequestBody Espaco espaco) {
        validarDados(espaco.getNomeEspaco(), espaco.getTipoEspaco(), espaco.getCapacidadePessoas());
        espaco.setIdEspaco(null);
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
        if (imagem.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A imagem deve ter até 5 MB.");
        }
        String contentType = imagem.getContentType();
        String extensao = switch (contentType == null ? "" : contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie a imagem em formato PNG ou JPG.");
        };
        String tipoImagem = extensao.equals(".png") ? "image/png" : "image/jpeg";
        try (InputStream enviado = imagem.getInputStream();
             ImageInputStream input = ImageIO.createImageInputStream(enviado)) {
            if (input == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
            Iterator<ImageReader> leitores = ImageIO.getImageReaders(input);
            if (!leitores.hasNext()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
            ImageReader leitor = leitores.next();
            try {
                leitor.setInput(input, true, true);
                String formato = leitor.getFormatName().toLowerCase(Locale.ROOT);
                if ((extensao.equals(".png") && !formato.equals("png"))
                    || (extensao.equals(".jpg") && !List.of("jpeg", "jpg").contains(formato))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O conteúdo do arquivo não corresponde ao formato informado.");
                }
                long pixels = (long) leitor.getWidth(0) * leitor.getHeight(0);
                if (pixels <= 0 || pixels > MAX_IMAGE_PIXELS) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A imagem excede as dimensões permitidas.");
                }
                String nomeArquivo = UUID.randomUUID() + extensao;
                Files.createDirectories(imageDirectory);
                try (InputStream conteudo = imagem.getInputStream()) {
                    Files.copy(conteudo, imageDirectory.resolve(nomeArquivo));
                }
                espaco.setArquivoImagem(nomeArquivo);
                espaco.setTipoImagem(tipoImagem);
            } finally {
                leitor.dispose();
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível salvar a imagem do espaço.");
        }
    }

    private void apagarImagem(String nomeArquivo) {
        if (nomeArquivo == null) return;
        Path arquivo = imageDirectory.resolve(nomeArquivo).normalize();
        if (!arquivo.getParent().equals(imageDirectory)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "O caminho da imagem armazenada é inválido.");
        }
        try {
            Files.deleteIfExists(arquivo);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível remover a imagem não salva.");
        }
    }
}
