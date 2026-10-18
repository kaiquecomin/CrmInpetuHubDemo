package com.inpetu.connect.config;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.repository.EspacoRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.util.List;
import java.util.Locale;

@Configuration(proxyBeanMethods = false)
public class EspacoCatalogoBootstrap {
    private record EspacoInicial(
        String codigo,
        String nome,
        String tipo,
        int capacidade,
        String equipamentos,
        String imagem,
        String nomeLegado
    ) {}

    private static final List<EspacoInicial> CATALOGO = List.of(
        new EspacoInicial("auditorio", "Auditório", "Auditório", 114, null, "auditorio.jpg", "Auditório Principal"),
        new EspacoInicial("sala-reuniao", "Sala de reunião", "Sala de reunião", 16, null, "sala-reuniao.jpg", null),
        new EspacoInicial("coworking", "Coworking", "Coworking", 35, null, "coworking.jpg", "Área de Coworking"),
        new EspacoInicial("sala-reuniao-1-coworking", "Sala de Reunião 1 (coworking)", "Sala de reunião", 6, null, "sala-reuniao-1-coworking.jpg", "Sala de Reunião 1"),
        new EspacoInicial("sala-reuniao-2-coworking", "Sala de Reunião 2 (coworking)", "Sala de reunião", 6, null, "sala-reuniao-2-coworking.jpg", "Sala de Reunião 2"),
        new EspacoInicial("sala-pre-incubacao", "Sala Pré-incubação", "Sala Pré-incubação", 34, null, "sala-pre-incubacao.jpg", null),
        new EspacoInicial("sala-maker-via", "Sala Maker VIA", "Sala Maker VIA", 32, "6 sofás", "sala-maker-via.jpg", null),
        new EspacoInicial("sala-via-hub", "Sala VIA hub", "Sala VIA hub", 15, "7 sofás, 1 arquibancada", "sala-via-hub.jpg", null),
        new EspacoInicial("sala-distrito-inovacao", "Sala Distrito de Inovação", "Sala Distrito de Inovação", 42, null, "sala-distrito-inovacao.jpg", null)
    );

    @Bean
    @Order(2)
    ApplicationRunner atualizarCatalogoDeEspacos(EspacoRepository espacos) {
        return (ApplicationArguments args) -> {
            List<Espaco> existentes = espacos.findAllByOrderByNomeEspaco();
            for (EspacoInicial inicial : CATALOGO) {
                Espaco existente = existentes.stream()
                    .filter(espaco -> inicial.codigo().equals(espaco.getCodigoCatalogo())
                        || nomeIgual(espaco.getNomeEspaco(), inicial.nome())
                        || inicial.nomeLegado() != null && nomeIgual(espaco.getNomeEspaco(), inicial.nomeLegado()))
                    .findFirst()
                    .orElse(null);
                if (existente != null) {
                    if (!inicial.codigo().equals(existente.getCodigoCatalogo())) {
                        existente.setCodigoCatalogo(inicial.codigo());
                        espacos.save(existente);
                    }
                    continue;
                }

                Espaco novo = new Espaco();
                novo.setCodigoCatalogo(inicial.codigo());
                novo.setNomeEspaco(inicial.nome());
                novo.setTipoEspaco(inicial.tipo());
                novo.setCapacidadePessoas(inicial.capacidade());
                novo.setArquivoImagem(inicial.imagem());
                novo.setTipoImagem("image/jpeg");
                novo.setEquipamentosDisponiveis(inicial.equipamentos());
                novo.setExigeAprovacaoManual(false);
                novo.setAtivo(true);
                existentes.add(espacos.save(novo));
            }
        };
    }

    private static boolean nomeIgual(String atual, String esperado) {
        return atual != null && atual.trim().toLowerCase(Locale.ROOT).equals(esperado.toLowerCase(Locale.ROOT));
    }
}
