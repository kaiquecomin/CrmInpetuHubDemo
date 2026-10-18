package com.inpetu.connect.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class ImageUploadService {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_IMAGE_PIXELS = 16_000_000;

    private ImageUploadService() {}

    public record StoredImage(String fileName, String contentType) {}

    public static StoredImage store(MultipartFile image, Path directory) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma imagem para enviar.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A imagem deve ter até 5 MB.");
        }

        String contentType = image.getContentType();
        String mediaType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT).trim();
        String extension = switch (mediaType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie uma imagem JPG, PNG ou WebP.");
        };
        byte[] bytes;
        try {
            bytes = image.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível ler a imagem enviada.");
        }
        validateImageContent(bytes, extension);

        String fileName = UUID.randomUUID() + extension;
        Path target = resolve(directory, fileName);
        try {
            Files.createDirectories(directory);
            Files.write(target, bytes, StandardOpenOption.CREATE_NEW);
            return new StoredImage(fileName, mediaType);
        } catch (IOException ex) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException cleanupError) {
                ex.addSuppressed(cleanupError);
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível salvar a imagem enviada.");
        }
    }

    public static Path resolve(Path directory, String fileName) {
        if (fileName == null || !fileName.matches("[A-Za-z0-9._-]+")
            || fileName.equals(".") || fileName.equals("..")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagem não encontrada.");
        }
        Path normalizedDirectory = directory.toAbsolutePath().normalize();
        Path target = normalizedDirectory.resolve(fileName).normalize();
        if (!normalizedDirectory.equals(target.getParent())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagem não encontrada.");
        }
        return target;
    }

    public static void delete(Path directory, String fileName) {
        if (fileName == null) return;
        try {
            Files.deleteIfExists(resolve(directory, fileName));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível remover a imagem armazenada.");
        }
    }

    private static void validateImageContent(byte[] bytes, String extension) {
        boolean signatureValid = switch (extension) {
            case ".png" -> bytes.length >= 8
                && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[] {
                    (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
                });
            case ".jpg" -> bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff;
            case ".webp" -> bytes.length >= 12
                && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
        if (!signatureValid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O conteúdo do arquivo não corresponde a uma imagem válida.");
        }

        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                boolean expectedFormat = switch (extension) {
                    case ".png" -> format.equals("png");
                    case ".jpg" -> List.of("jpeg", "jpg").contains(format);
                    case ".webp" -> format.equals("webp");
                    default -> false;
                };
                if (!expectedFormat) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O conteúdo do arquivo não corresponde ao formato informado.");
                }
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels <= 0 || pixels > MAX_IMAGE_PIXELS) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A imagem excede as dimensões permitidas.");
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
        }
    }
}
