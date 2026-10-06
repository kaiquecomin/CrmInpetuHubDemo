package com.inpetu.connect.config;

import com.inpetu.connect.model.ItemEcossistema;
import com.inpetu.connect.repository.ItemEcossistemaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EcossistemaSeedTest {
    @Mock ItemEcossistemaRepository itens;

    @Test
    void completaListaParcialSemAlterarOsItensExistentes() throws Exception {
        ItemEcossistema ufsc = item("UFSC", "Descrição personalizada", false);
        ItemEcossistema sapiens = item("Sapiens Parque", "Descrição própria", true);
        when(itens.findAll()).thenReturn(List.of(ufsc, sapiens));

        ApplicationRunner seed = new EcossistemaSeed().seedEcossistema(itens);
        seed.run(new DefaultApplicationArguments());

        ArgumentCaptor<ItemEcossistema> novosItens = ArgumentCaptor.forClass(ItemEcossistema.class);
        verify(itens, times(13)).save(novosItens.capture());
        assertEquals(9, novosItens.getAllValues().stream().filter(item -> "Iniciativa".equals(item.getCategoria())).count());
        assertEquals(4, novosItens.getAllValues().stream().filter(item -> "Parceiro".equals(item.getCategoria())).count());
        assertTrue(novosItens.getAllValues().stream().anyMatch(item ->
            "InPETU Lumen".equals(item.getNome()) && item.getUrlDestino().startsWith("https://")));
        assertEquals("Descrição personalizada", ufsc.getDescricao());
        assertFalse(ufsc.getAtivo());
        assertEquals("Descrição própria", sapiens.getDescricao());
    }

    @Test
    void naoInsereNovamenteItensQueJaExistem() throws Exception {
        List<ItemEcossistema> itensExistentes = List.of(
            "UFSC", "Sapiens Parque", "ACATE", "Sebrae SC", "CELTA", "Univali",
            "Distrito de inovação", "Ecossistema de Inovação", "Escritório de Promoção da Inovação (EPI)",
            "InPETU G.E.N.I.U.S", "InPETU Living Lab Sapiens",
            "Laboratório de Inovação para Desafios Sociais e Urbanos", "InPETU Maker",
            "InPETU Open Lab", "InPETU Lumen"
        ).stream().map(nome -> item(nome, "Descrição existente", true)).toList();
        when(itens.findAll()).thenReturn(itensExistentes);

        ApplicationRunner seed = new EcossistemaSeed().seedEcossistema(itens);
        seed.run(new DefaultApplicationArguments());

        verify(itens, never()).save(any(ItemEcossistema.class));
    }

    private ItemEcossistema item(String nome, String descricao, boolean ativo) {
        ItemEcossistema item = new ItemEcossistema();
        item.setNome(nome);
        item.setDescricao(descricao);
        item.setAtivo(ativo);
        return item;
    }
}
