package com.inpetu.connect.config;

import org.springframework.security.web.util.matcher.RequestMatcher;

import java.util.List;

public interface OptionalFeatureModule {
    String configurationKey();

    default List<RequestMatcher> securityBypassMatchers() {
        return List.of();
    }
}
