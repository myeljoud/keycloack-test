import { useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { useIsPasswordRevealed } from "keycloakify/tools/useIsPasswordRevealed";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import eyeIcon from "../assets/eye-icon.svg";
import checkIcon from "../assets/check-emphasis.svg";

/**
 * login.ftl — username + password. Markup is ours; the contract is Keycloak's:
 * POST to `url.loginAction` with `username`, `password`, `rememberMe`,
 * `credentialId`. Keycloak still owns brute-force detection, MFA, required
 * actions and the session cookie, which is the point of theming instead of
 * hosting the form in the app.
 */
export default function Login(props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { realm, url, usernameHidden, login, auth, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;

    const [submitting, setSubmitting] = useState(false);
    const hasError = messagesPerField.existsError("username", "password");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={msg("loginAccountTitle")}
        >
            {realm.password && (
                <form id="kc-form-login" className="nc-form" action={url.loginAction} method="post" onSubmit={() => setSubmitting(true)}>
                    {!usernameHidden && (
                        <div className="nc-field">
                            <label htmlFor="username" className="nc-field__label">
                                {!realm.loginWithEmailAllowed ? msg("username") : !realm.registrationEmailAsUsername ? msg("usernameOrEmail") : msg("email")}
                            </label>
                            <div className="nc-input-wrap" data-invalid={hasError}>
                                <input
                                    tabIndex={2}
                                    id="username"
                                    className="nc-input"
                                    name="username"
                                    defaultValue={login.username ?? ""}
                                    type="text"
                                    autoFocus
                                    autoComplete="username"
                                    aria-invalid={hasError}
                                />
                            </div>
                        </div>
                    )}

                    <div className="nc-field">
                        <label htmlFor="password" className="nc-field__label">
                            {msg("password")}
                        </label>
                        <PasswordField i18n={i18n} invalid={hasError} />
                        {hasError && (
                            <span
                                id="input-error"
                                className="nc-field__error"
                                aria-live="polite"
                                dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.getFirstError("username", "password")) }}
                            />
                        )}
                    </div>

                    <div className="nc-row">
                        {realm.rememberMe && !usernameHidden ? (
                            <label className="nc-checkbox">
                                <input tabIndex={5} id="rememberMe" name="rememberMe" type="checkbox" defaultChecked={!!login.rememberMe} />
                                <span className="nc-checkbox__knob" aria-hidden="true">
                                    <img src={checkIcon} alt="" />
                                </span>
                                {msg("rememberMe")}
                            </label>
                        ) : (
                            <span />
                        )}
                        {realm.resetPasswordAllowed && (
                            <a tabIndex={6} className="nc-link" href={url.loginResetCredentialsUrl}>
                                {msg("doForgotPassword")}
                            </a>
                        )}
                    </div>

                    <input type="hidden" id="id-hidden-input" name="credentialId" value={auth.selectedCredential} />
                    <button tabIndex={7} className="nc-button" name="login" id="kc-login" type="submit" disabled={submitting}>
                        {msgStr("doLogIn")}
                    </button>
                </form>
            )}

            <p className="nc-legal">
                By clicking “{msgStr("doLogIn")}” you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
            </p>
        </Template>
    );
}

function PasswordField(props: { i18n: I18n; invalid: boolean }) {
    const { i18n, invalid } = props;
    const { msgStr } = i18n;
    const { isPasswordRevealed, toggleIsPasswordRevealed } = useIsPasswordRevealed({ passwordInputId: "password" });

    return (
        <div className="nc-input-wrap" data-invalid={invalid}>
            <input tabIndex={3} id="password" className="nc-input" name="password" type="password" autoComplete="current-password" aria-invalid={invalid} />
            <button
                type="button"
                className="nc-icon-button"
                aria-label={msgStr(isPasswordRevealed ? "hidePassword" : "showPassword")}
                aria-pressed={isPasswordRevealed}
                aria-controls="password"
                onClick={toggleIsPasswordRevealed}
                tabIndex={4}
            >
                <img src={eyeIcon} alt="" />
            </button>
        </div>
    );
}
