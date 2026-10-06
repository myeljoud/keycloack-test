import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

export default defineConfig({
    plugins: [
        react(),
        keycloakify({
            // Shows up as "next-console" in Realm settings → Themes → Login theme.
            themeName: "next-console",
            accountThemeImplementation: "none"
        })
    ]
});
