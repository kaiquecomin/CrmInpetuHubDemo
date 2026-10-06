package com.inpetu.connect.controller;

import com.inpetu.connect.dto.DuvidaRequest;
import com.inpetu.connect.dto.DuvidaRespostaRequest;
import com.inpetu.connect.model.DuvidaAtendimento;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@RestController @RequestMapping("/api/v1/duvidas")
public class DuvidaController {
    private final DuvidaAtendimentoRepository duvidas;
    private final Path uploadDirectory;
    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean mailEnabled;
    private final String mailFrom;
    public DuvidaController(DuvidaAtendimentoRepository duvidas, @Value("${app.upload.dir:uploads/inpetu}") String uploadDirectory,
                            ObjectProvider<JavaMailSender> mailSender, @Value("${app.mail.enabled:false}") boolean mailEnabled,
                            @Value("${app.mail.from}") String mailFrom) {
        this.duvidas = duvidas; this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
        this.mailSender = mailSender; this.mailEnabled = mailEnabled; this.mailFrom = mailFrom;
    }
    @PostMapping @Transactional public DuvidaAtendimento criar(@Valid @RequestBody DuvidaRequest request) {
        return salvar(request, null);
    }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @Transactional
    public DuvidaAtendimento criarComAnexo(@Valid @RequestPart("dados") DuvidaRequest request,
                                           @RequestPart(value = "anexo", required = false) MultipartFile anexo) {
        return salvar(request, anexo);
    }
    private DuvidaAtendimento salvar(DuvidaRequest request, MultipartFile anexo) {
        DuvidaAtendimento d = new DuvidaAtendimento(); d.setEmailContato(request.emailContato()); d.setTelefoneContato(request.telefoneContato()); d.setMensagemDuvida(request.mensagemDuvida());
        Path savedAttachment = null;
        if (anexo != null && !anexo.isEmpty()) {
            if (anexo.getSize() > 10L * 1024 * 1024) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O anexo deve ter até 10 MB.");
            String mime = anexo.getContentType();
            String normalizedMime = mime == null ? "" : mime.toLowerCase(Locale.ROOT);
            String extension = switch (normalizedMime) {
                case "application/pdf" -> ".pdf"; case "image/png" -> ".png"; case "image/jpeg" -> ".jpg";
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato inválido. Envie PDF, PNG ou JPG.");
            };
            validarConteudoAnexo(anexo, normalizedMime);
            try {
                Files.createDirectories(uploadDirectory);
                String fileName = UUID.randomUUID() + extension;
                savedAttachment = uploadDirectory.resolve(fileName);
                try (var input = anexo.getInputStream()) {
                    Files.copy(input, savedAttachment);
                }
                d.setCaminhoAnexo(fileName);
            } catch (IOException ex) {
                removerAnexo(savedAttachment, ex);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível salvar o anexo.", ex);
            }
        }
        try {
            return duvidas.save(d);
        } catch (RuntimeException ex) {
            removerAnexo(savedAttachment, ex);
            throw ex;
        }
    }
    @GetMapping @PreAuthorize("hasAnyRole('COORDENADOR','STAFF')") public List<DuvidaAtendimento> listar() { return duvidas.findAll(); }
    @GetMapping("/{id}/anexo") @PreAuthorize("hasAnyRole('COORDENADOR','STAFF')")
    public ResponseEntity<Resource> baixarAnexo(@PathVariable Integer id) {
        DuvidaAtendimento d = duvidas.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação de atendimento não encontrada."));
        if (d.getCaminhoAnexo() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Esta dúvida não possui anexo.");
        Path file = uploadDirectory.resolve(d.getCaminhoAnexo()).normalize();
        if (!file.getParent().equals(uploadDirectory) || !Files.isRegularFile(file)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo não encontrado.");
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(d.getCaminhoAnexo()).build().toString())
            .body(new FileSystemResource(file));
    }
    @PostMapping("/{id}/responder") @PreAuthorize("hasAnyRole('COORDENADOR','STAFF')") @Transactional
    public DuvidaAtendimento responder(@PathVariable Integer id, @Valid @RequestBody DuvidaRespostaRequest request) {
        String resposta = request.resposta().trim();
        DuvidaAtendimento d = duvidas.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação de atendimento não encontrada."));
        d.setRespostaEquipe(resposta); d.setStatusAtendimento("Respondida"); d.setDataResposta(LocalDateTime.now());
        DuvidaAtendimento salva = duvidas.save(d);
        JavaMailSender sender = mailSender.getIfAvailable();
        if (mailEnabled && sender != null) {
            SimpleMailMessage message = new SimpleMailMessage(); message.setFrom(mailFrom); message.setTo(d.getEmailContato());
            message.setSubject("Resposta da equipe InPETU Hub"); message.setText(resposta); sender.send(message);
        }
        return salva;
    }

    private void validarConteudoAnexo(MultipartFile anexo, String mime) {
        try (var input = anexo.getInputStream()) {
            byte[] header = input.readNBytes(1024);
            boolean valido = switch (mime) {
                case "application/pdf" -> new String(header, java.nio.charset.StandardCharsets.US_ASCII).contains("%PDF-");
                case "image/png" -> header.length >= 8 &&
                    java.util.Arrays.equals(java.util.Arrays.copyOf(header, 8),
                        new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
                case "image/jpeg" -> header.length >= 3 &&
                    header[0] == (byte) 0xff && header[1] == (byte) 0xd8 && header[2] == (byte) 0xff;
                default -> false;
            };
            if (!valido) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O conteúdo do anexo não corresponde ao formato informado.");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível validar o anexo.", ex);
        }
    }

    private void removerAnexo(Path arquivo, Throwable original) {
        if (arquivo == null) return;
        try {
            Files.deleteIfExists(arquivo);
        } catch (IOException cleanupError) {
            original.addSuppressed(cleanupError);
        }
    }
}
