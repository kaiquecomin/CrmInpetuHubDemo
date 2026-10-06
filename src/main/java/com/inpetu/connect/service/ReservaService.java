package com.inpetu.connect.service;

import com.inpetu.connect.dto.ReservaRequest;
import com.inpetu.connect.dto.ReservaEdicaoRequest;
import com.inpetu.connect.model.*;
import com.inpetu.connect.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReservaService {
    private final ReservaRepository reservas;
    private final EspacoRepository espacos;
    private final UsuarioRepository usuarios;
    private final CancelamentoReservaRepository cancelamentos;
    private final LogAuditoriaRepository auditoria;
    private final NotificacaoService notificacoes;

    public ReservaService(ReservaRepository reservas, EspacoRepository espacos, UsuarioRepository usuarios,
            CancelamentoReservaRepository cancelamentos, LogAuditoriaRepository auditoria,
            NotificacaoService notificacoes) {
        this.reservas = reservas;
        this.espacos = espacos;
        this.usuarios = usuarios;
        this.cancelamentos = cancelamentos;
        this.auditoria = auditoria;
        this.notificacoes = notificacoes;
    }

    @Transactional
    public Reserva criar(ReservaRequest request, String email) {
        if (!request.horarioFim().isAfter(request.horarioInicio()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O horário final deve ser posterior ao inicial.");
        Espaco espaco = espacos.bloquearParaReserva(request.idEspaco())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaço não encontrado."));
        boolean visitaGuiada = "Visita guiada".equalsIgnoreCase(espaco.getTipoEspaco());
        if (visitaGuiada) {
            if (request.quantidadeParticipantes() == null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a quantidade de visitantes.");
            if (espaco.getCapacidadePessoas() != null
                    && request.quantidadeParticipantes() > espaco.getCapacidadePessoas())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A quantidade de visitantes excede a capacidade da visita.");
            if (request.horarioInicio().isBefore(LocalTime.of(8, 0)) ||
                    request.horarioFim().isAfter(LocalTime.of(22, 0)))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A visita deve acontecer entre 08:00 e 22:00.");
        }
        if (!Boolean.TRUE.equals(espaco.getAtivo())) {
            String motivo = espaco.getMotivoIndisponibilidade();
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    motivo == null || motivo.isBlank() ? "Este espaço está indisponível."
                            : "Este espaço está indisponível: " + motivo);
        }
        Usuario solicitante = usuarioAtivo(email);
        solicitante = usuarios.bloquearParaCota(solicitante.getIdUsuario())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Solicitante não encontrado."));
        if (reservas.existeConflito(espaco.getIdEspaco(), request.dataReserva(),
                request.horarioInicio(), request.horarioFim()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este horário já foi reservado. Os pedidos são atendidos por ordem de solicitação.");
        LocalDateTime solicitadaEm = LocalDateTime.now();
        Reserva reserva = new Reserva();
        reserva.setTituloEvento(request.tituloEvento());
        reserva.setDescricaoFinalidade(request.descricaoFinalidade());
        reserva.setDataReserva(request.dataReserva());
        reserva.setHorarioInicio(request.horarioInicio());
        reserva.setHorarioFim(request.horarioFim());
        reserva.setIdEspaco(espaco.getIdEspaco());
        reserva.setQuantidadeParticipantes(request.quantidadeParticipantes());
        reserva.setIdSolicitante(solicitante.getIdUsuario());
        reserva.setDataSolicitacao(solicitadaEm);
        double horasPedido = horas(request.horarioInicio(), request.horarioFim());
        Double limiteMensal = limiteMensal(solicitante.getIdPersona());
        boolean excedeCota = limiteMensal != null
                && horasReservadas(solicitante.getIdUsuario(), request.dataReserva(), null) + horasPedido > limiteMensal;
        boolean exigeAprovacao = visitaGuiada || Boolean.TRUE.equals(espaco.getExigeAprovacaoManual())
                || solicitante.getIdPersona() == null || excedeCota;
        reserva.setStatusReserva(exigeAprovacao ? "Pendente" : "Confirmada");
        reserva.setExcedeCota(excedeCota);
        Reserva criada = reservas.save(reserva);
        registrar("reserva", criada.getIdReserva(), "CRIACAO",
                "Reserva criada com status: " + criada.getStatusReserva(), solicitante.getIdUsuario(), solicitadaEm);
        notificacoes.enviar(destinatarios(solicitante), "RESERVA_CRIADA", "Solicitação de reserva recebida",
                "Sua reserva \"" + criada.getTituloEvento() + "\" foi registrada como " + criada.getStatusReserva()
                        + ". O horário fica reservado pela ordem do pedido.");
        if (excedeCota) notificarExcedente(criada, solicitante, limiteMensal, horasPedido);
        return criada;
    }

    @Transactional
    public Reserva editar(Integer id, ReservaEdicaoRequest request, String email) {
        if (!request.horarioFim().isAfter(request.horarioInicio()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O horário final deve ser posterior ao inicial.");
        Reserva reserva = reservas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada."));
        if ("Cancelada".equals(reserva.getStatusReserva()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Uma reserva cancelada não pode ser editada.");

        Usuario responsavel = usuarioAtivo(email);
        Espaco espaco = espacos.bloquearParaReserva(request.idEspaco())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaço não encontrado."));
        if (!Boolean.TRUE.equals(espaco.getAtivo()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este espaço está indisponível.");
        validarVisita(espaco, request.quantidadeParticipantes(), request.horarioInicio(), request.horarioFim());
        if (reservas.existeConflitoParaAtualizacao(espaco.getIdEspaco(), id, request.dataReserva(),
                request.horarioInicio(), request.horarioFim()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este horário já está reservado.");

        Usuario solicitante = usuarios.bloquearParaCota(reserva.getIdSolicitante())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitante não encontrado."));
        String anterior = resumoHorario(reserva);
        double horasPedido = horas(request.horarioInicio(), request.horarioFim());
        Double limiteMensal = limiteMensal(solicitante.getIdPersona());
        boolean excedeCota = limiteMensal != null
                && horasReservadas(solicitante.getIdUsuario(), request.dataReserva(), id) + horasPedido > limiteMensal;
        boolean passouAExceder = excedeCota && !Boolean.TRUE.equals(reserva.getExcedeCota());

        reserva.setTituloEvento(request.tituloEvento().trim());
        reserva.setDescricaoFinalidade(request.descricaoFinalidade().trim());
        reserva.setDataReserva(request.dataReserva());
        reserva.setHorarioInicio(request.horarioInicio());
        reserva.setHorarioFim(request.horarioFim());
        reserva.setIdEspaco(espaco.getIdEspaco());
        reserva.setQuantidadeParticipantes(request.quantidadeParticipantes());
        reserva.setExcedeCota(excedeCota);
        if (excedeCota) {
            reserva.setStatusReserva("Pendente");
            reserva.setIdUsuarioAprovador(null);
            reserva.setDataAprovacao(null);
        }
        Reserva atualizada = reservas.save(reserva);
        LocalDateTime alteradaEm = LocalDateTime.now();
        registrar("reserva", id, "EDICAO",
                "Reserva alterada de [" + anterior + "] para [" + resumoHorario(atualizada) + "] por "
                        + responsavel.getNomeCompleto(),
                responsavel.getIdUsuario(), alteradaEm);
        if (passouAExceder) notificarExcedente(atualizada, solicitante, limiteMensal, horasPedido);
        return atualizada;
    }

    @Transactional
    public void cancelar(Integer id, String motivo, String email) {
        if (motivo == null || motivo.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O motivo do cancelamento é obrigatório.");
        Usuario responsavel = usuarioAtivo(email);
        Reserva reserva = reservas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada."));
        boolean equipe = responsavel.getIdPerfil() != null && responsavel.getIdPerfil() < 4;
        if (!equipe && !reserva.getIdSolicitante().equals(responsavel.getIdUsuario()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pode cancelar esta reserva.");
        if ("Cancelada".equals(reserva.getStatusReserva()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A reserva já foi cancelada.");
        long diasAntecedencia = ChronoUnit.DAYS.between(LocalDate.now(), reserva.getDataReserva());
        if (!equipe && diasAntecedencia < 15)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "O cancelamento pelo solicitante deve ser feito com pelo menos 15 dias de antecedência. Procure a equipe para solicitar uma exceção.");
        espacos.bloquearParaReserva(reserva.getIdEspaco());
        LocalDateTime canceladaEm = LocalDateTime.now();
        reserva.setStatusReserva("Cancelada");
        reservas.save(reserva);
        CancelamentoReserva cancelamento = new CancelamentoReserva();
        cancelamento.setIdReserva(id);
        cancelamento.setMotivoCancelamento(motivo.trim());
        cancelamento.setDataCancelamento(canceladaEm);
        cancelamento.setIdUsuarioResponsavel(responsavel.getIdUsuario());
        cancelamentos.save(cancelamento);
        registrar("reserva", id, "CANCELAMENTO", motivo.trim(), responsavel.getIdUsuario(), canceladaEm);
        Usuario solicitante = usuarios.findById(reserva.getIdSolicitante())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitante da reserva não encontrado."));
        notificacoes.enviar(destinatarios(solicitante), "RESERVA_CANCELADA", "Reserva cancelada",
                "A reserva \"" + reserva.getTituloEvento() + "\" para " + reserva.getDataReserva()
                        + " (" + reserva.getHorarioInicio() + "–" + reserva.getHorarioFim()
                        + ") foi cancelada. Motivo: " + motivo.trim());
    }

    @Transactional
    public Reserva aprovar(Integer id, String email) {
        Usuario aprovador = usuarioAtivo(email);
        Reserva reserva = reservas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada."));
        if (!"Pendente".equals(reserva.getStatusReserva()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A reserva não está pendente.");
        if (Boolean.TRUE.equals(reserva.getExcedeCota())
                && (reserva.getObservacaoNegociacao() == null || reserva.getObservacaoNegociacao().isBlank()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Registre o contato e o resultado da negociação com o solicitante antes de aprovar esta reserva.");
        Espaco espaco = espacos.bloquearParaReserva(reserva.getIdEspaco())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaço não encontrado."));
        if (reservas.existeReservaAnteriorConflitante(espaco.getIdEspaco(), id, reserva.getDataReserva(),
                reserva.getHorarioInicio(), reserva.getHorarioFim(), reserva.getDataSolicitacao()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Há uma solicitação anterior para este horário. A reserva mais antiga mantém a prioridade.");
        LocalDateTime aprovadaEm = LocalDateTime.now();
        reserva.setStatusReserva("Confirmada");
        reserva.setIdUsuarioAprovador(aprovador.getIdUsuario());
        reserva.setDataAprovacao(aprovadaEm);
        Reserva atualizada = reservas.save(reserva);
        registrar("reserva", id, "APROVACAO",
                Boolean.TRUE.equals(reserva.getExcedeCota())
                        ? "Reserva excedente aprovada após negociação: " + reserva.getObservacaoNegociacao()
                        : "Reserva aprovada",
                aprovador.getIdUsuario(), aprovadaEm);
        Usuario solicitante = usuarios.findById(reserva.getIdSolicitante())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitante da reserva não encontrado."));
        notificacoes.enviar(destinatarios(solicitante), "RESERVA_APROVADA", "Reserva aprovada",
                "Sua reserva \"" + reserva.getTituloEvento() + "\" foi aprovada para " + reserva.getDataReserva()
                        + ", das " + reserva.getHorarioInicio() + " às " + reserva.getHorarioFim() + ".");
        return atualizada;
    }

    @Transactional
    public Reserva registrarNegociacao(Integer id, String observacao, String email) {
        Usuario responsavel = usuarioAtivo(email);
        Reserva reserva = reservas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada."));
        if (!Boolean.TRUE.equals(reserva.getExcedeCota()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta reserva não está sinalizada como excedente.");
        if (!"Pendente".equals(reserva.getStatusReserva()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A negociação só pode ser registrada para uma reserva pendente.");
        LocalDateTime registradaEm = LocalDateTime.now();
        reserva.setObservacaoNegociacao(observacao.trim());
        reserva.setDataNegociacao(registradaEm);
        reserva.setIdUsuarioNegociacao(responsavel.getIdUsuario());
        Reserva atualizada = reservas.save(reserva);
        registrar("reserva", id, "NEGOCIACAO_COTA", observacao.trim(), responsavel.getIdUsuario(), registradaEm);
        return atualizada;
    }

    public List<Reserva> minhas(String email) {
        return reservas.findByIdSolicitanteOrderByDataReservaDesc(usuarioAtivo(email).getIdUsuario());
    }

    private Usuario usuarioAtivo(String email) {
        return usuarios.findByEmail(email).filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Usuário inativo ou não encontrado."));
    }

    private void validarVisita(Espaco espaco, Integer participantes, LocalTime inicio, LocalTime fim) {
        if (!"Visita Guiada".equalsIgnoreCase(espaco.getTipoEspaco())) return;
        if (participantes == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a quantidade de visitantes.");
        if (espaco.getCapacidadePessoas() != null && participantes > espaco.getCapacidadePessoas())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A quantidade de visitantes excede a capacidade da visita.");
        if (inicio.isBefore(LocalTime.of(8, 0)) || fim.isAfter(LocalTime.of(22, 0)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A visita deve acontecer entre 08:00 e 22:00.");
    }

    private Double limiteMensal(Integer persona) {
        if (persona == null) return null;
        return switch (persona) {
            case 2 -> 30d;
            case 3 -> 20d;
            case 4, 5 -> 10d;
            case 1, 6 -> null;
            default -> throw new ResponseStatusException(HttpStatus.CONFLICT, "Persona de uso inválida.");
        };
    }

    private double horasReservadas(Integer solicitante, LocalDate data, Integer reservaIgnorada) {
        YearMonth mes = YearMonth.from(data);
        return reservas.findByIdSolicitanteAndDataReservaBetweenAndStatusReservaIn(
                        solicitante, mes.atDay(1), mes.atEndOfMonth(), List.of("Pendente", "Confirmada"))
                .stream()
                .filter(reserva -> reservaIgnorada == null || !reserva.getIdReserva().equals(reservaIgnorada))
                .mapToDouble(reserva -> horas(reserva.getHorarioInicio(), reserva.getHorarioFim()))
                .sum();
    }

    private double horas(LocalTime inicio, LocalTime fim) {
        return ChronoUnit.MINUTES.between(inicio, fim) / 60d;
    }

    private String resumoHorario(Reserva reserva) {
        return reserva.getTituloEvento() + " / espaço " + reserva.getIdEspaco() + " / " + reserva.getDataReserva()
                + " " + reserva.getHorarioInicio() + "–" + reserva.getHorarioFim();
    }

    private void notificarExcedente(Reserva reserva, Usuario solicitante, double limite, double horasPedido) {
        YearMonth mes = YearMonth.from(reserva.getDataReserva());
        double total = horasReservadas(solicitante.getIdUsuario(), reserva.getDataReserva(), null);
        String mensagem = "A reserva \"" + reserva.getTituloEvento() + "\" do solicitante "
                + solicitante.getNomeCompleto() + " (persona P" + solicitante.getIdPersona()
                + ") excede a cota mensal de " + limite + " horas. Total solicitado no mês: "
                + String.format(java.util.Locale.forLanguageTag("pt-BR"), "%.1f", total)
                + " h (inclui " + String.format(java.util.Locale.forLanguageTag("pt-BR"), "%.1f", horasPedido)
                + " h nesta solicitação). A equipe deve negociar com o solicitante antes da aprovação. Período: "
                + mes + ".";
        notificacoes.enviar(usuarios.findAllByAtivoTrueAndIdPerfilLessThan(4), "COTA_EXCEDIDA",
                "Reserva excede a cota mensal", mensagem);
    }

    private List<Usuario> destinatarios(Usuario solicitante) {
        List<Usuario> destinatarios = new ArrayList<>();
        destinatarios.add(solicitante);
        destinatarios.addAll(usuarios.findAllByAtivoTrueAndIdPerfilLessThan(4));
        return destinatarios;
    }

    private void registrar(String tabela, Integer id, String acao, String detalhes, Integer usuario,
            LocalDateTime dataHora) {
        LogAuditoria log = new LogAuditoria();
        log.setTabelaAfetada(tabela);
        log.setIdRegistroAfetado(id);
        log.setAcao(acao);
        log.setDetalhesAlteracao(detalhes);
        log.setIdUsuarioResponsavel(usuario);
        log.setDataHora(dataHora);
        auditoria.save(log);
    }
}
