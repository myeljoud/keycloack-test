import { useEffect } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { useInitialize } from "keycloakify/login/Template.useInitialize";
import type { I18n } from "./i18n";
import type { KcContext } from "./KcContext";
import logo from "./assets/logo.svg";
import diagonalLeft from "./assets/diagonal-lines-left.svg";
import diagonalRight from "./assets/diagonal-lines-right.svg";

/**
 * Page shell shared by every login-flow page: grid background, "Next | Console"
 * lockup, white card, Keycloak feedback message, then the page's own content.
 */
export default function Template(props: TemplateProps<KcContext, I18n>) {
    const { displayMessage = true, headerNode, infoNode = null, displayInfo = false, documentTitle, kcContext, i18n, doUseDefaultCss, children } =
        props;

    const { msgStr, currentLanguage, enabledLanguages } = i18n;
    const { realm, message, isAppInitiatedAction } = kcContext;

    useEffect(() => {
        document.title = documentTitle ?? msgStr("loginTitle", realm.displayName || realm.name);
    }, []);

    const { isReadyToRender } = useInitialize({ kcContext, doUseDefaultCss });
    if (!isReadyToRender) return null;

    const showMessage = displayMessage && message !== undefined && (message.type !== "warning" || !isAppInitiatedAction);

    return (
        <div className="nc-page">
            <div className="nc-grid" aria-hidden="true">
                <div className="nc-grid__vertical" />
                <img className="nc-grid__diagonal nc-grid__diagonal--left" src={diagonalLeft} alt="" />
                <img className="nc-grid__diagonal nc-grid__diagonal--right" src={diagonalRight} alt="" />
            </div>
            <div className="nc-glow" aria-hidden="true" />

            {enabledLanguages.length > 1 && (
                <nav className="nc-lang" aria-label={msgStr("languages")}>
                    {enabledLanguages.map(({ languageTag, label, href }) => (
                        <a
                            key={languageTag}
                            href={href}
                            className="nc-lang__item"
                            aria-current={languageTag === currentLanguage.languageTag ? "true" : undefined}
                            lang={languageTag}
                        >
                            {label}
                        </a>
                    ))}
                </nav>
            )}

            <div className="nc-logo">
                <img className="nc-logo__mark" src={logo} alt="Next" />
                <span className="nc-logo__divider" aria-hidden="true" />
                <span className="nc-logo__product">Console</span>
            </div>

            <main className="nc-card">
                <h1 className="nc-card__title" id="kc-page-title">
                    {headerNode}
                </h1>
                <div className="nc-card__content">
                    {showMessage && (
                        <div className={`nc-alert nc-alert--${message.type}`} role={message.type === "error" ? "alert" : "status"}>
                            <span dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
                        </div>
                    )}
                    {children}
                    {displayInfo && infoNode}
                </div>
            </main>
        </div>
    );
}
