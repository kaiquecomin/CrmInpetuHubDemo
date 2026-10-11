package com.inpetu.connect.config;

import com.inpetu.connect.model.Espaco;
import com.inpetu.connect.repository.EspacoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EspacoCatalogoBootstrapTest {
    @Test
    void updatesExistingRoomsCreatesMissingRoomsAndIsIdempotent() throws Exception {
        EspacoRepository repository = mock(EspacoRepository.class);
        List<Espaco> rooms = new ArrayList<>(List.of(
            room(1, "Auditório Principal", "Auditório", 80, "Projetor e som"),
            room(2, "Sala de Aula 1", "Sala de aula", 35, "Projetor e quadro"),
            room(3, "Área de Coworking", "Coworking", 24, "Mesas compartilhadas, Wi-Fi"),
            room(4, "Sala de Reunião 1", "Sala de reunião", 6, "Monitor e videoconferência"),
            room(5, "Sala de Reunião 2", "Sala de reunião", 10, "Monitor e quadro"),
            room(6, "Visita Guiada", "Visita guiada", 20, "Acompanhamento")
        ));
        AtomicInteger nextId = new AtomicInteger(6);
        when(repository.findAllByOrderByNomeEspaco()).thenAnswer(invocation -> new ArrayList<>(rooms));
        when(repository.save(any(Espaco.class))).thenAnswer(invocation -> {
            Espaco room = invocation.getArgument(0);
            if (room.getIdEspaco() == null) {
                room.setIdEspaco(nextId.incrementAndGet());
                rooms.add(room);
            }
            return room;
        });

        ApplicationRunner runner = new EspacoCatalogoBootstrap().atualizarCatalogoDeEspacos(repository);
        ApplicationArguments args = mock(ApplicationArguments.class);
        runner.run(args);
        runner.run(args);

        assertEquals(11, rooms.size());
        assertEquals(9, rooms.stream().filter(room -> Boolean.TRUE.equals(room.getAtivo())).count());
        assertFalse(find(rooms, "Sala de Aula 1").getAtivo());
        assertEquals("Fora do catálogo atual; histórico e reservas preservados.",
            find(rooms, "Sala de Aula 1").getMotivoIndisponibilidade());
        assertFalse(find(rooms, "Visita Guiada").getAtivo());
        assertEquals(1, find(rooms, "Auditório").getIdEspaco());
        assertEquals(114, find(rooms, "Auditório").getCapacidadePessoas());
        assertEquals("Projetor e som", find(rooms, "Auditório").getEquipamentosDisponiveis());
        assertEquals(3, find(rooms, "Coworking").getIdEspaco());
        assertEquals(35, find(rooms, "Coworking").getCapacidadePessoas());
        assertEquals(4, find(rooms, "Sala de Reunião 1 (coworking)").getIdEspaco());
        assertEquals(5, find(rooms, "Sala de Reunião 2 (coworking)").getIdEspaco());
        assertEquals("6 sofás", find(rooms, "Sala Maker VIA").getEquipamentosDisponiveis());
        assertEquals("7 sofás, 1 arquibancada", find(rooms, "Sala VIA hub").getEquipamentosDisponiveis());
        assertEquals("image/jpeg", find(rooms, "Sala Distrito de Inovação").getTipoImagem());
        verify(repository, never()).delete(any(Espaco.class));
    }

    private Espaco room(int id, String name, String type, int capacity, String equipment) {
        Espaco room = new Espaco();
        room.setIdEspaco(id);
        room.setNomeEspaco(name);
        room.setTipoEspaco(type);
        room.setCapacidadePessoas(capacity);
        room.setEquipamentosDisponiveis(equipment);
        room.setAtivo(true);
        return room;
    }

    private Espaco find(List<Espaco> rooms, String name) {
        return rooms.stream().filter(room -> name.equals(room.getNomeEspaco())).findFirst().orElseThrow();
    }
}
