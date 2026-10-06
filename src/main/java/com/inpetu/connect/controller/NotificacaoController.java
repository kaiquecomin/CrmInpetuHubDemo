package com.inpetu.connect.controller;

import com.inpetu.connect.model.Notificacao;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.NotificacaoRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notificacoes")
public class NotificacaoController {
    private final NotificacaoRepository notificacoes;
    private final UsuarioRepository usuarios;

    public NotificacaoController(NotificacaoRepository notificacoes, UsuarioRepository usuarios) {
        this.notificacoes = notificacoes;
        this.usuarios = usuarios;
    }

    @GetMapping("/minhas")
    public List<Notificacao> minhas(Authentication auth) {
        return notificacoes.findByIdUsuarioDestinatarioOrderByDataHoraDesc(usuarioAtivo(auth).getIdUsuario());
    }

    @PatchMapping("/{id}/lida")
    public Notificacao marcarLida(@PathVariable Integer id, Authentication auth) {
        Usuario usuario = usuarioAtivo(auth);
        Notificacao notificacao = notificacoes.findByIdNotificacaoAndIdUsuarioDestinatario(id, usuario.getIdUsuario())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."));
        notificacao.setLida(true);
        return notificacoes.save(notificacao);
    }

    @PatchMapping("/lidas")
    public void marcarTodasLidas(Authentication auth) {
        List<Notificacao> pendentes = notificacoes
                .findByIdUsuarioDestinatarioAndLidaFalse(usuarioAtivo(auth).getIdUsuario());
        pendentes.forEach(notificacao -> notificacao.setLida(true));
        notificacoes.saveAll(pendentes);
    }

    private Usuario usuarioAtivo(Authentication auth) {
        return usuarios.findByEmail(auth.getName()).filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário inativo ou não encontrado."));
    }
}
