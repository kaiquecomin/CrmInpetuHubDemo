package com.inpetu.connect.controller;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.model.Reserva;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Controller
public class PainelAdministrativoController {
    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private static final List<String> EQUIPE_ROLES = List.of(
            "ROLE_COORDENADOR", "ROLE_GESTOR_ESPACOS", "ROLE_STAFF");

    private final ReservaRepository reservas;
    private final UsuarioRepository usuarios;
    private final OrganizacaoRepository organizacoes;
    private final EspacoRepository espacos;
    private final DuvidaAtendimentoRepository duvidas;

    public PainelAdministrativoController(ReservaRepository reservas, UsuarioRepository usuarios,
            OrganizacaoRepository organizacoes, EspacoRepository espacos,
            DuvidaAtendimentoRepository duvidas) {
        this.reservas = reservas;
        this.usuarios = usuarios;
        this.organizacoes = organizacoes;
        this.espacos = espacos;
        this.duvidas = duvidas;
    }

    @GetMapping({"/paineladm", "/paineladm/"})
    public String index(Authentication authentication, Model model, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        if (!isEquipe(authentication)) {
            return authentication == null || !authentication.isAuthenticated()
                    ? "redirect:/?view=access"
                    : "redirect:/";
        }

        Usuario usuario = usuarios.findByEmailIgnoreCase(authentication.getName()).orElse(null);
        LocalDate hoje = LocalDate.now(SAO_PAULO);
        List<Reserva> reservasDoDia = reservas.findByDataReservaAndStatusReservaIn(
                hoje, List.of("Confirmada", "Pendente"));
        List<Reserva> agenda = reservasDoDia.stream()
                .sorted(Comparator.comparing(Reserva::getHorarioInicio))
                .limit(6)
                .toList();
        Map<Integer, Espaco> espacosPorId = espacos.findAllById(
                        agenda.stream().map(Reserva::getIdEspaco).distinct().toList()).stream()
                .collect(Collectors.toMap(Espaco::getIdEspaco, Function.identity()));
        Map<Integer, Usuario> usuariosPorId = usuarios.findAllById(
                        agenda.stream().map(Reserva::getIdSolicitante).distinct().toList()).stream()
                .collect(Collectors.toMap(Usuario::getIdUsuario, Function.identity()));

        List<ReservaPainel> agendaPainel = agenda.stream().map(reserva -> {
            Espaco espaco = espacosPorId.get(reserva.getIdEspaco());
            Usuario solicitante = usuariosPorId.get(reserva.getIdSolicitante());
            return new ReservaPainel(
                    reserva.getTituloEvento(),
                    espaco == null ? "Espaço não encontrado" : espaco.getNomeEspaco(),
                    solicitante == null ? "Solicitante" : solicitante.getNomeCompleto(),
                    reserva.getHorarioInicio().toString(),
                    reserva.getHorarioFim().toString(),
                    reserva.getStatusReserva());
        }).toList();

        model.addAttribute("nome", usuario == null ? "equipe" : primeiroNome(usuario.getNomeCompleto()));
        model.addAttribute("hoje", hoje);
        model.addAttribute("hojeLabel", hoje.format(
                DateTimeFormatter.ofPattern("EEEE, dd 'de' MMMM", Locale.forLanguageTag("pt-BR"))));
        model.addAttribute("hojeFormatada", hoje.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        model.addAttribute("reservasHoje", reservasDoDia.size());
        model.addAttribute("reservasPendentes", reservas.countByStatusReserva("Pendente"));
        model.addAttribute("espacosAtivos", espacos.countByAtivoTrue());
        model.addAttribute("organizacoes", organizacoes.count());
        model.addAttribute("duvidasPendentes", duvidas.countByStatusAtendimento("Pendente"));
        model.addAttribute("agenda", agendaPainel);
        return "paineladm/index";
    }

    private boolean isEquipe(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(EQUIPE_ROLES::contains);
    }

    private String primeiroNome(String nome) {
        if (nome == null || nome.isBlank()) {
            return "equipe";
        }
        return nome.trim().split("\\s+", 2)[0];
    }

    public record ReservaPainel(String evento, String espaco, String solicitante,
            String inicio, String fim, String status) {}
}
