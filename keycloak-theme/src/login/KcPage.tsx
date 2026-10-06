import { Suspense, lazy } from "react";
import type { ClassKey } from "keycloakify/login";
import type { KcContext } from "./KcContext";
import { useI18n } from "./i18n";
import DefaultPage from "keycloakify/login/DefaultPage";
import DefaultTemplate from "keycloakify/login/Template";
import Template from "./Template";
import "./main.css";

const Login = lazy(() => import("./pages/Login"));
const UserProfileFormFields = lazy(() => import("keycloakify/login/UserProfileFormFields"));

export default function KcPage(props: { kcContext: KcContext }) {
    const { kcContext } = props;
    const { i18n } = useI18n({ kcContext });

    return (
        <Suspense>
            {(() => {
                switch (kcContext.pageId) {
                    // Branded page: our markup, our CSS, no PatternFly.
                    case "login.ftl":
                        return <Login kcContext={kcContext} i18n={i18n} classes={classes} Template={Template} doUseDefaultCss={false} />;
                    // Every other page (reset password, OTP, errors, …) falls back to
                    // Keycloakify's defaults until it gets the same treatment.
                    default:
                        return (
                            <DefaultPage
                                kcContext={kcContext}
                                i18n={i18n}
                                classes={classes}
                                Template={DefaultTemplate}
                                doUseDefaultCss={true}
                                UserProfileFormFields={UserProfileFormFields}
                                doMakeUserConfirmPassword={true}
                            />
                        );
                }
            })()}
        </Suspense>
    );
}

const classes = {} satisfies { [key in ClassKey]?: string };
