package com.inpetu.connect.controller;

import com.inpetu.connect.model.ItemEcossistema;
import com.inpetu.connect.repository.ItemEcossistemaRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.*;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ecossistema")
public class ItemEcossistemaController {
    private static final long MAX_LOGO_SIZE = 5L * 1024 * 1024;
    private static final int MAX_LOGO_PIXELS = 16_000_000;
    private final ItemEcossistemaRepository itens;
    private final Path logoDirectory;

    public ItemEcossistemaController(
        ItemEcossistemaRepository itens,
        @Value("${app.upload.dir:uploads/inpetu}") String uploadDirectory
    ) {
        this.itens = itens;
        this.logoDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize().resolve("ecossistema");
    }

    @GetMapping
    public List<ItemEcossistema> listarPublicos() {
        return itens.findAllByAtivoTrueOrderByOrdemAscIdItemEcossistemaAsc();
    }

    @GetMapping("/gerenciar")
    @PreAuthorize("hasRole('COORDENADOR')")
    public List<ItemEcossistema> listarParaGestao() {
        return itens.findAllByOrderByOrdemAscIdItemEcossistemaAsc();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('COORDENADOR')")
    public ItemEcossistema criar(
        @RequestParam String nome,
        @RequestParam String descricao,
        @RequestParam(defaultValue = "Parceiro") String categoria,
        @RequestParam(required = false) String urlDestino,
        @RequestParam(defaultValue = "0") Integer ordem,
        @RequestParam(defaultValue = "true") Boolean ativo,
        @RequestPart(value = "logo", required = false) MultipartFile logo
    ) {
        ItemEcossistema item = new ItemEcossistema();
        preencher(item, nome, descricao, categoria, urlDestino, ordem, ativo);
        guardarLogo(item, logo);
        return itens.save(item);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('COORDENADOR')")
    public ItemEcossistema atualizar(
        @PathVariable Integer id,
        @RequestParam String nome,
        @RequestParam String descricao,
        @RequestParam(defaultValue = "Parceiro") String categoria,
        @RequestParam(required = false) String urlDestino,
        @RequestParam(defaultValue = "0") Integer ordem,
        @RequestParam(defaultValue = "true") Boolean ativo,
        @RequestParam(defaultValue = "false") Boolean removerLogo,
        @RequestPart(value = "logo", required = false) MultipartFile logo
    ) {
        ItemEcossistema item = buscar(id);
        preencher(item, nome, descricao, categoria, urlDestino, ordem, ativo);
        String logoAntigo = item.getArquivoLogo();
        if (Boolean.TRUE.equals(removerLogo)) {
            item.setArquivoLogo(null);
            item.setTipoLogo(null);
        } else if (logo != null && !logo.isEmpty()) {
            guardarLogo(item, logo);
        }
        ItemEcossistema salvo = itens.save(item);
        if (logoAntigo != null && !logoAntigo.equals(salvo.getArquivoLogo())) apagarLogo(logoAntigo);
        return salvo;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('COORDENADOR')")
    @Transactional
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        ItemEcossistema item = buscar(id);
        String logo = item.getArquivoLogo();
        itens.delete(item);
        if (logo != null) apagarLogo(logo);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/logo")
    public ResponseEntity<Resource> obterLogo(@PathVariable Integer id) {
        ItemEcossistema item = buscar(id);
        String tipoLogo = item.getTipoLogo();
        if (item.getArquivoLogo() == null || tipoLogo == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este item não possui logo.");
        }
        Path arquivo = logoDirectory.resolve(item.getArquivoLogo()).normalize();
        if (!arquivo.getParent().equals(logoDirectory) || !Files.isRegularFile(arquivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Logo não encontrado.");
        }
        MediaType tipo = MediaType.parseMediaType(tipoLogo);
        return ResponseEntity.ok()
            .contentType(tipo)
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
            .body(new FileSystemResource(arquivo));
    }

    private ItemEcossistema buscar(Integer id) {
        return itens.findById(Objects.requireNonNull(id, "O identificador do item é obrigatório"))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item do ecossistema não encontrado."));
    }

    private void preencher(ItemEcossistema item, String nome, String descricao, String categoria, String urlDestino, Integer ordem, Boolean ativo) {
        String nomeLimpo = nome == null ? "" : nome.trim();
        String descricaoLimpa = descricao == null ? "" : descricao.trim();
        if (nomeLimpo.isBlank() || nomeLimpo.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um nome de até 120 caracteres.");
        }
        if (descricaoLimpa.isBlank() || descricaoLimpa.length() > 600) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe uma descrição de até 600 caracteres.");
        }
        if (ordem == null || ordem < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A posição deve ser zero ou maior.");
        }
        String categoriaLimpa = categoria == null ? "" : categoria.trim();
        if (!List.of("Parceiro", "Iniciativa").contains(categoriaLimpa)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A categoria deve ser Parceiro ou Iniciativa.");
        }
        String urlLimpa = urlDestino == null ? "" : urlDestino.trim();
        if (!urlLimpa.isEmpty()) {
            try {
                URI uri = URI.create(urlLimpa);
                if (!uri.isAbsolute() || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || urlLimpa.length() > 500) {
                    throw new IllegalArgumentException();
                }
            } catch (IllegalArgumentException error) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um link HTTPS válido com até 500 caracteres.");
            }
        }
        item.setNome(nomeLimpo);
        item.setDescricao(descricaoLimpa);
        item.setCategoria(categoriaLimpa);
        item.setUrlDestino(urlLimpa.isEmpty() ? null : urlLimpa);
        item.setOrdem(ordem);
        item.setAtivo(Boolean.TRUE.equals(ativo));
    }

    private void guardarLogo(ItemEcossistema item, MultipartFile logo) {
        if (logo == null || logo.isEmpty()) return;
        if (logo.getSize() > MAX_LOGO_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O logo deve ter até 5 MB.");
        }
        String tipoRecebido = logo.getContentType();
        String extensao = switch (tipoRecebido == null ? "" : tipoRecebido.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie o logo em formato PNG ou JPG.");
        };
        String tipoLogo = extensao.equals(".png") ? "image/png" : "image/jpeg";
        try (InputStream enviado = logo.getInputStream();
             ImageInputStream input = ImageIO.createImageInputStream(enviado)) {
            if (input == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
            Iterator<ImageReader> leitores = ImageIO.getImageReaders(input);
            if (!leitores.hasNext()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
            ImageReader leitor = leitores.next();
            try {
                leitor.setInput(input, true, true);
                String formato = leitor.getFormatName().toLowerCase();
                if ((extensao.equals(".png") && !formato.equals("png"))
                    || (extensao.equals(".jpg") && !List.of("jpeg", "jpg").contains(formato))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O conteúdo do arquivo não corresponde ao formato informado.");
                }
                long pixels = (long) leitor.getWidth(0) * leitor.getHeight(0);
                if (pixels <= 0 || pixels > MAX_LOGO_PIXELS) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A imagem do logo excede as dimensões permitidas.");
                }
                String nomeArquivo = UUID.randomUUID() + extensao;
                Files.createDirectories(logoDirectory);
                try (InputStream conteudo = logo.getInputStream()) {
                    Files.copy(conteudo, logoDirectory.resolve(nomeArquivo));
                }
                item.setArquivoLogo(nomeArquivo);
                item.setTipoLogo(tipoLogo);
            } finally {
                leitor.dispose();
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível salvar o logo.");
        }
    }

    private void apagarLogo(String nomeArquivo) {
        Path arquivo = logoDirectory.resolve(nomeArquivo).normalize();
        if (!arquivo.getParent().equals(logoDirectory)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "O caminho do logo armazenado é inválido.");
        }
        try {
            Files.deleteIfExists(arquivo);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível remover o logo antigo.");
        }
    }
}
