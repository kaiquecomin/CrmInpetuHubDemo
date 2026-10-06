package com.inpetu.connect.db;

/** Guarda, por requisição (thread), qual banco deve ser usado: "main" (principal) ou "test" (teste). */
public final class DbContext {
    public static final String MAIN = "main";
    public static final String TEST = "test";
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private DbContext() {}

    public static String get() {
        String value = CURRENT.get();
        return value == null ? MAIN : value;
    }

    public static void set(String db) { CURRENT.set(normalizar(db)); }

    public static void clear() { CURRENT.remove(); }

    /** Qualquer valor diferente de "test" cai no banco principal (padrão seguro). */
    public static String normalizar(String db) {
        return db != null && TEST.equalsIgnoreCase(db.trim()) ? TEST : MAIN;
    }

    public static void runIn(String db, Runnable action) {
        String anterior = CURRENT.get();
        set(db);
        try { action.run(); }
        finally { if (anterior == null) clear(); else CURRENT.set(anterior); }
    }
}
