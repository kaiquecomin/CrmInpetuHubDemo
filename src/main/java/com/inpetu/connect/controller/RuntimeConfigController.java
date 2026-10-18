package com.inpetu.connect.controller;

import com.inpetu.connect.config.OptionalFeatureModule;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/config")
public class RuntimeConfigController {
    private final boolean muralEnabled;
    private final Set<String> availableFeatures;

    public RuntimeConfigController(
        @Value("${app.features.mural:false}") boolean muralEnabled,
        ObjectProvider<OptionalFeatureModule> optionalModules
    ) {
        this.muralEnabled = muralEnabled;
        this.availableFeatures = optionalModules.orderedStream()
            .map(OptionalFeatureModule::configurationKey)
            .collect(Collectors.toUnmodifiableSet());
    }

    @GetMapping
    public Map<String, Boolean> getConfig() {
        return Map.of("mural", muralEnabled && availableFeatures.contains("mural"));
    }
}
