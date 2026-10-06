import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { KcPage } from "./kc.gen";

// `pnpm theme:dev` renders the login page with a mocked Keycloak context so the
// design can be iterated on without a running Keycloak. Production bundles
// (built by `keycloakify build`) never include this block.
if (import.meta.env.DEV && !window.kcContext) {
    const { getKcContextMock } = await import("./login/KcPageStory");
    window.kcContext = getKcContextMock({
        pageId: "login.ftl",
        overrides: {
            realm: { displayName: "Next Console", rememberMe: true, resetPasswordAllowed: true, loginWithEmailAllowed: true }
        }
    });
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>{!window.kcContext ? <h1>No Keycloak Context</h1> : <KcPage kcContext={window.kcContext} />}</StrictMode>
);
