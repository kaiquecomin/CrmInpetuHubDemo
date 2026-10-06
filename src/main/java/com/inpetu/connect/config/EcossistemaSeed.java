package com.inpetu.connect.config;

import com.inpetu.connect.model.ItemEcossistema;
import com.inpetu.connect.repository.ItemEcossistemaRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
public class EcossistemaSeed {
    private record ItemInicial(String nome, String descricao, String categoria, String url) {}

    private static final List<ItemInicial> ITENS_INICIAIS = List.of(
        new ItemInicial("UFSC", "Universidade Federal de Santa Catarina, parceira acadêmica e científica do InPETU Hub.", "Parceiro", null),
        new ItemInicial("Sapiens Parque", "Parque de inovação que conecta empresas, universidade, governo e sociedade.", "Parceiro", null),
        new ItemInicial("ACATE", "Associação Catarinense de Tecnologia e parceira do ecossistema de inovação.", "Parceiro", null),
        new ItemInicial("Sebrae SC", "Apoio ao empreendedorismo e ao desenvolvimento de pequenos negócios em Santa Catarina.", "Parceiro", null),
        new ItemInicial("CELTA", "Incubadora de empresas de base tecnológica de Santa Catarina.", "Parceiro", null),
        new ItemInicial("Univali", "Universidade parceira na produção de conhecimento, pesquisa e inovação.", "Parceiro", null),
        new ItemInicial("Distrito de inovação", "Iniciativa de planejamento urbano sustentável para o norte da ilha, integrando inovação, infraestrutura e identidade local.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/distrito-de-inovacao/"),
        new ItemInicial("Ecossistema de Inovação", "Articulação de atores, projetos e rotas estratégicas para fortalecer o Sapiens Parque como polo de inovação.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/inpetu-ecossistema/"),
        new ItemInicial("Escritório de Promoção da Inovação (EPI)", "Programa de apoio a empreendedores e projetos em estágio inicial, oferecendo orientação, conexões e estrutura para transformar ideias em negócios viáveis.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/escritorio-de-promocao-da-inovacao-epi/"),
        new ItemInicial("InPETU G.E.N.I.U.S", "Programa de formação e experimentação em inovação para jovens, com foco em desafios do território.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/genius/"),
        new ItemInicial("InPETU Living Lab Sapiens", "Ambiente de teste e validação de tecnologias em contexto real, gerando impacto urbano e melhorando a experiência das pessoas no Sapiens Parque.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/living-lab/"),
        new ItemInicial("Laboratório de Inovação para Desafios Sociais e Urbanos", "Espaço dedicado à criação de soluções públicas e comunitárias por meio de escuta ativa, colaboração e impacto social.", "Iniciativa", null),
        new ItemInicial("InPETU Maker", "Laboratório de prototipagem voltado a transformar ideias em soluções reais, unindo criatividade, tecnologia e colaboração.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/inpetu-maker/"),
        new ItemInicial("InPETU Open Lab", "Espaço de cocriação para desenvolver soluções em parceria com empresas, universidades e startups.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/inovacao-aberta/"),
        new ItemInicial("InPETU Lumen", "Programa de apoio a empreendedores e iniciativas em estágio inicial, oferecendo capacitação, conexões e estrutura para transformar ideias em negócios viáveis.", "Iniciativa", "https://inpetuhub.sites.ufsc.br/inpetu-lumen/")
    );

    @Bean
    ApplicationRunner seedEcossistema(ItemEcossistemaRepository itens) {
        return args -> {
            Map<String, ItemEcossistema> existentes = itens.findAll().stream()
                .collect(Collectors.toMap(item -> item.getNome().toLowerCase(Locale.ROOT), item -> item, (first, ignored) -> first));
            for (int i = 0; i < ITENS_INICIAIS.size(); i++) {
                ItemInicial inicial = ITENS_INICIAIS.get(i);
                if (existentes.containsKey(inicial.nome().toLowerCase(Locale.ROOT))) continue;
                ItemEcossistema item = new ItemEcossistema();
                item.setNome(inicial.nome());
                item.setDescricao(inicial.descricao());
                item.setCategoria(inicial.categoria());
                item.setUrlDestino(inicial.url());
                item.setOrdem(i);
                item.setAtivo(true);
                itens.save(item);
            }
        };
    }
}
