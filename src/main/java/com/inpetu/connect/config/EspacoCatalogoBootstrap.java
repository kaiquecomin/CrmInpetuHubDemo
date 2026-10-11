package com.inpetu.connect.config;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.repository.EspacoRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Configuration(proxyBeanMethods = false)
public class EspacoCatalogoBootstrap {
    private record EspacoInicial(
        String nome,
        String tipo,
        int capacidade,
        String equipamentos,
        String imagem,
        String nomeLegado
    ) {}

    private static final List<EspacoInicial> CATALOGO = List.of(
        new EspacoInicial("Auditório", "Auditório", 114, null, "auditorio.jpg", "Auditório Principal"),
        new EspacoInicial("Sala de reunião", "Sala de reunião", 16, null, "sala-reuniao.jpg", null),
        new EspacoInicial("Coworking", "Coworking", 35, null, "coworking.jpg", "Área de Coworking"),
        new EspacoInicial("Sala de Reunião 1 (coworking)", "Sala de reunião", 6, null, "sala-reuniao-1-coworking.jpg", "Sala de Reunião 1"),
        new EspacoInicial("Sala de Reunião 2 (coworking)", "Sala de reunião", 6, null, "sala-reuniao-2-coworking.jpg", "Sala de Reunião 2"),
        new EspacoInicial("Sala Pré-incubação", "Sala Pré-incubação", 34, null, "sala-pre-incubacao.jpg", null),
        new EspacoInicial("Sala Maker VIA", "Sala Maker VIA", 32, "6 sofás", "sala-maker-via.jpg", null),
        new EspacoInicial("Sala VIA hub", "Sala VIA hub", 15, "7 sofás, 1 arquibancada", "sala-via-hub.jpg", null),
        new EspacoInicial("Sala Distrito de Inovação", "Sala Distrito de Inovação", 42, null, "sala-distrito-inovacao.jpg", null)
    );

    @Bean
    @Order(2)
    ApplicationRunner atualizarCatalogoDeEspacos(EspacoRepository espacos) {
        return (ApplicationArguments args) -> {
            List<Espaco> existentes = new ArrayList<>(espacos.findAllByOrderByNomeEspaco());
            for (EspacoInicial inicial : CATALOGO) {
                List<Espaco> correspondencias = existentes.stream()
                    .filter(espaco -> nomeIgual(espaco.getNomeEspaco(), inicial.nome())
                        || inicial.nomeLegado() != null && nomeIgual(espaco.getNomeEspaco(), inicial.nomeLegado()))
                    .toList();
                Espaco escolhido = correspondencias.stream()
                    .filter(espaco -> nomeIgual(espaco.getNomeEspaco(), inicial.nome()))
                    .findFirst()
                    .orElseGet(() -> correspondencias.stream().findFirst().orElseGet(Espaco::new));

                escolhido.setNomeEspaco(inicial.nome());
                escolhido.setTipoEspaco(inicial.tipo());
                escolhido.setCapacidadePessoas(inicial.capacidade());
                escolhido.setArquivoImagem(inicial.imagem());
                escolhido.setTipoImagem("image/jpeg");
                if (inicial.equipamentos() != null) {
                    escolhido.setEquipamentosDisponiveis(inicial.equipamentos());
                }
                espacos.save(escolhido);
                if (!existentes.contains(escolhido)) {
                    existentes.add(escolhido);
                }

                for (Espaco duplicado : correspondencias) {
                    if (duplicado != escolhido) {
                        duplicado.setAtivo(false);
                        espacos.save(duplicado);
                    }
                }
            }

            for (Espaco antigo : existentes) {
                if (nomeIgual(antigo.getNomeEspaco(), "Sala de Aula 1")
                    || nomeIgual(antigo.getNomeEspaco(), "Visita Guiada")) {
                    antigo.setAtivo(false);
                    antigo.setMotivoIndisponibilidade("Fora do catálogo atual; histórico e reservas preservados.");
                    antigo.setDataPrevisaoRetorno(null);
                    espacos.save(antigo);
                }
            }
        };
    }

    private static boolean nomeIgual(String atual, String esperado) {
        return atual != null && atual.trim().toLowerCase(Locale.ROOT).equals(esperado.toLowerCase(Locale.ROOT));
    }
}
