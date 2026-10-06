package com.inpetu.connect.config;

import com.inpetu.connect.model.DuvidaAtendimento;
import com.inpetu.connect.model.Organizacao;
import com.inpetu.connect.model.Reserva;
import com.inpetu.connect.model.Usuario;
import com.inpetu.connect.repository.DuvidaAtendimentoRepository;
import com.inpetu.connect.repository.EspacoRepository;
import com.inpetu.connect.repository.OrganizacaoRepository;
import com.inpetu.connect.repository.ReservaRepository;
import com.inpetu.connect.repository.UsuarioRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Configuration
@Profile("demo")
public class DemoDataSeed {
    private record PessoaDemo(String nome, String email, String cargo, String organizacao, int perfil, Integer persona, String senhaDemo) {}
    private record ReservaDemo(String titulo, String descricao, String tipoEspaco, int dias, String inicio, String fim, int participantes, String status) {}
    private record ChamadoDemo(String email, String telefone, String mensagem, String resposta, String status) {}

    private static final List<PessoaDemo> PESSOAS = List.of(
        new PessoaDemo("Coordenador InPETU", "admin@inpetuhub.ufsc.br", "Coordenação", "UFSC / InPETU Hub", 1, 1, "InPetu-Admin-2026!"),
        new PessoaDemo("Camila Nunes", "demo.coordenacao@inpetu.test", "Coordenação de demonstração", "UFSC / InPETU Hub", 1, 1, "Coord-Demo-2026!"),
        new PessoaDemo("Rafael Martins", "demo.gestor@inpetu.test", "Gestor de espaços (demonstração)", "Laboratório Lagoa (Demonstração)", 2, 1, "Gestor-Demo-2026!"),
        new PessoaDemo("Lia Ferreira", "demo.atendimento@inpetu.test", "Atendimento (demonstração)", "Laboratório Lagoa (Demonstração)", 3, 1, "Atende-Demo-2026!"),
        new PessoaDemo("Ana Souza", "ana@laboratorio-lagoa.test", "Pesquisadora", "Laboratório Lagoa (Demonstração)", 4, 3, "Ana-LabLagoa-2026!"),
        new PessoaDemo("Helena Faria (Governo/UFSC)", "helena@governo-ufsc-demo.test", "Assessora Especial", "Governo Estadual / UFSC (DEMO)", 4, 4, "Helena-GovUFSC-2026!"),
        new PessoaDemo("Marcos Lima", "marcos@cidade-criativa.test", "Coordenador de projetos", "Cidade Criativa (Demonstração)", 4, 3, "Marcos-Cidade-2026!"),
        new PessoaDemo("Bianca Costa", "bianca@startup-ilha.test", "Fundadora", "Startup Ilha (Demonstração)", 4, 3, "Bianca-Startup-2026!"),
        new PessoaDemo("Pedro Almeida", "pedro@acate-labs-demo.test", "Líder de inovação", "ACATE Labs (DEMO)", 4, 3, "Pedro-ACATE-2026!"),
        new PessoaDemo("Júlia Ribeiro", "julia@mare-sustentavel-demo.test", "Diretora de projetos", "Maré Sustentável (DEMO)", 4, 3, "Julia-Mare-2026!"),
        new PessoaDemo("Lucas Freitas", "lucas@ponte-digital-demo.test", "Fundador", "Ponte Digital (DEMO)", 4, 5, "Lucas-Ponte-2026!"),
        new PessoaDemo("Marina Lopes", "marina@cidade-laboratorio-demo.test", "Pesquisadora", "Cidade Laboratório (DEMO)", 4, 2, "Marina-Cidade-2026!"),
        new PessoaDemo("André Carvalho", "andre@impacto-ilha-demo.test", "Gestor de comunidade", "Impacto Ilha (DEMO)", 4, 5, "Andre-Impacto-2026!")
    );

    private static final List<ReservaDemo> RESERVAS = List.of(
        new ReservaDemo("Oficina de inovação aberta (DEMO)", "Dados de demonstração para validar a revisão de reservas.", "Sala de Aula 1", 2, "09:00", "11:00", 18, "Pendente"),
        new ReservaDemo("Reunião Estratégica UFSC/Governo (DEMO)", "Reunião de alinhamento para teste da persona P4.", "Sala de Aula 1", 2, "11:30", "13:30", 15, "Pendente"),
        new ReservaDemo("Reunião do Laboratório Lagoa (DEMO)", "Encontro fictício para teste de aprovação.", "Sala de Reunião 1", 3, "14:00", "15:30", 6, "Confirmada"),
        new ReservaDemo("Visita técnica à Startup Ilha (DEMO)", "Solicitação fictícia de visita guiada.", "Visita Guiada", 5, "10:00", "11:30", 12, "Pendente"),
        new ReservaDemo("Workshop ACATE Labs (DEMO)", "Atividade fictícia de empresa parceira para testar o fluxo de aprovação.", "Auditório Principal", 4, "09:30", "12:00", 32, "Pendente"),
        new ReservaDemo("Encontro Maré Sustentável (DEMO)", "Encontro fictício de inovação sustentável.", "Área de Coworking", 6, "13:00", "15:00", 16, "Confirmada"),
        new ReservaDemo("Mentoria Ponte Digital (DEMO)", "Sessão fictícia de mentoria para teste de agenda.", "Sala de Reunião 2", 7, "10:00", "11:00", 5, "Pendente"),
        new ReservaDemo("Pesquisa Cidade Laboratório (DEMO)", "Sessão fictícia de pesquisa com participantes.", "Sala de Aula 1", 8, "14:00", "16:00", 20, "Pendente"),
        new ReservaDemo("Roda de conversa Impacto Ilha (DEMO)", "Atividade fictícia para testar reservas de grupo.", "Auditório Principal", 9, "14:00", "16:00", 40, "Pendente")
    );

    private static final List<ChamadoDemo> CHAMADOS = List.of(
        new ChamadoDemo("ana@laboratorio-lagoa.test", "(48) 90000-0101", "DEMO: Como consultar a disponibilidade de uma sala?", null, "Pendente"),
        new ChamadoDemo("marcos@cidade-criativa.test", "(48) 90000-0102", "DEMO: Precisamos atualizar o horário da atividade cadastrada.", "DEMO: A equipe recebeu a solicitação. Este é um exemplo de resposta.", "Respondida"),
        new ChamadoDemo("bianca@startup-ilha.test", "(48) 90000-0103", "DEMO: A visita guiada pode receber 12 participantes?", null, "Pendente")
    );

    @Bean
    public ApplicationRunner seedDemoData(
        UsuarioRepository usuarios,
        OrganizacaoRepository organizacoes,
        EspacoRepository espacos,
        ReservaRepository reservas,
        DuvidaAtendimentoRepository duvidas,
        PasswordEncoder passwordEncoder,
        @Value("${spring.datasource.url}") String datasourceUrl,
        @Value("${DEMO_DATA_ALLOW_NON_LOCAL:false}") boolean allowNonLocalDatabase
    ) {
        return args -> {
            if (!allowNonLocalDatabase && !usesLocalDatabase(datasourceUrl)) {
                throw new IllegalStateException("A carga demo só pode usar banco local. Confirme conscientemente com DEMO_DATA_ALLOW_NON_LOCAL=true para outro banco.");
            }
            if (PESSOAS.stream().anyMatch(pessoa -> pessoa.senhaDemo().length() < 12 || pessoa.senhaDemo().length() > 72)) {
                throw new IllegalStateException("As senhas de demonstração devem ter entre 12 e 72 caracteres.");
            }
            var usuariosDemo = PESSOAS.stream().map(pessoa -> criarUsuario(pessoa, passwordEncoder, usuarios, organizacoes)).toList();
            Usuario coordenacao = usuariosDemo.stream().filter(usuario -> usuario.getEmail().equals("demo.coordenacao@inpetu.test")).findFirst().orElseThrow();
            var solicitantes = usuariosDemo.stream().filter(usuario -> usuario.getIdPerfil() == 4).toList();
            if (solicitantes.size() < RESERVAS.size()) {
                throw new IllegalStateException("A carga demo precisa de um solicitante de teste para cada reserva.");
            }

            for (int i = 0; i < RESERVAS.size(); i++) {
                ReservaDemo dados = RESERVAS.get(i);
                Usuario solicitante = solicitantes.get(i);
                if (reservas.existsByTituloEventoAndIdSolicitante(dados.titulo(), solicitante.getIdUsuario())) {
                    if (dados.titulo().equals("Reunião Estratégica UFSC/Governo (DEMO)")) {
                        reservas.findByTituloEventoAndIdSolicitante(dados.titulo(), solicitante.getIdUsuario())
                            .filter(existing -> !existing.getHorarioInicio().equals(LocalTime.parse(dados.inicio()))
                                || !existing.getHorarioFim().equals(LocalTime.parse(dados.fim())))
                            .ifPresent(existing -> {
                                existing.setHorarioInicio(LocalTime.parse(dados.inicio()));
                                existing.setHorarioFim(LocalTime.parse(dados.fim()));
                                reservas.save(existing);
                            });
                    }
                    continue;
                }

                var espaco = espacos.findByNomeEspacoIgnoreCase(dados.tipoEspaco()).orElseThrow(() ->
                    new IllegalStateException("Espaço seed não encontrado: " + dados.tipoEspaco()));
                Reserva reserva = new Reserva();
                reserva.setTituloEvento(dados.titulo());
                reserva.setDescricaoFinalidade(dados.descricao());
                reserva.setDataReserva(LocalDate.now().plusDays(dados.dias()));
                reserva.setHorarioInicio(LocalTime.parse(dados.inicio()));
                reserva.setHorarioFim(LocalTime.parse(dados.fim()));
                reserva.setQuantidadeParticipantes(dados.participantes());
                reserva.setStatusReserva(dados.status());
                reserva.setIdEspaco(espaco.getIdEspaco());
                reserva.setIdSolicitante(solicitante.getIdUsuario());
                reserva.setDataSolicitacao(LocalDateTime.now().minusDays(10 - i));
                if ("Confirmada".equals(dados.status())) {
                    reserva.setIdUsuarioAprovador(coordenacao.getIdUsuario());
                    reserva.setDataAprovacao(reserva.getDataSolicitacao());
                }
                reservas.save(reserva);
            }

            for (ChamadoDemo dados : CHAMADOS) {
                if (duvidas.existsByEmailContatoAndMensagemDuvida(dados.email(), dados.mensagem())) continue;
                DuvidaAtendimento chamado = new DuvidaAtendimento();
                chamado.setEmailContato(dados.email());
                chamado.setTelefoneContato(dados.telefone());
                chamado.setMensagemDuvida(dados.mensagem());
                chamado.setStatusAtendimento(dados.status());
                chamado.setRespostaEquipe(dados.resposta());
                duvidas.save(chamado);
            }
        };
    }

    private boolean usesLocalDatabase(String jdbcUrl) {
        String prefix = "jdbc:mysql:";
        if (jdbcUrl == null || !jdbcUrl.startsWith(prefix)) return false;
        try {
            String host = java.net.URI.create(jdbcUrl.substring(prefix.length())).getHost();
            return host != null && List.of("localhost", "127.0.0.1", "::1").contains(host.toLowerCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private Usuario criarUsuario(
        PessoaDemo dados,
        PasswordEncoder passwordEncoder,
        UsuarioRepository usuarios,
        OrganizacaoRepository organizacoes
    ) {
        var existente = usuarios.findByEmailIgnoreCase(dados.email());
        if (existente.isPresent()) {
            Usuario usuario = existente.get();
            if (usuario.getSenhaHash() == null || !passwordEncoder.matches(dados.senhaDemo(), usuario.getSenhaHash())) {
                usuario.setSenhaHash(passwordEncoder.encode(dados.senhaDemo()));
                return usuarios.save(usuario);
            }
            return usuario;
        }

        Organizacao organizacao = organizacoes.findByNomeOrganizacaoIgnoreCase(dados.organizacao()).orElseGet(() -> {
            Organizacao nova = new Organizacao();
            nova.setNomeOrganizacao(dados.organizacao());
            nova.setTipoOrganizacao(dados.persona() == 3 || dados.persona() == 5 ? "Empresa parceira (DEMO)" : "Demonstração");
            return organizacoes.save(nova);
        });
        Usuario usuario = new Usuario();
        usuario.setNomeCompleto(dados.nome());
        usuario.setEmail(dados.email());
        usuario.setCargoVinculo(dados.cargo());
        usuario.setSenhaHash(passwordEncoder.encode(dados.senhaDemo()));
        usuario.setIdPerfil(dados.perfil());
        usuario.setIdPersona(dados.persona());
        usuario.setIdOrganizacao(organizacao.getIdOrganizacao());
        usuario.setAtivo(true);
        return usuarios.save(usuario);
    }
}
