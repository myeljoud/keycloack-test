import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

/**
 * Wording changes from the design. Every key overridden here MUST be given in
 * every language the console supports: a key defined in one language becomes
 * the fallback for all the others, so an English-only override would replace
 * the French and Arabic strings Keycloak ships.
 * @see https://docs.keycloakify.dev/features/i18n
 */
const { useI18n, ofTypeI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withCustomTranslations({
        en: {
            loginAccountTitle: "Login to your account",
            usernameOrEmail: "Username or Email",
            rememberMe: "Remember me?",
            doForgotPassword: "Forgot password?",
            doLogIn: "Log in",
            legalNotice: "By clicking “{0}” you agree to our",
            termsOfUse: "Terms of Use",
            legalAnd: "and",
            privacyPolicy: "Privacy Policy"
        },
        fr: {
            loginAccountTitle: "Connectez-vous à votre compte",
            usernameOrEmail: "Nom d’utilisateur ou e-mail",
            rememberMe: "Se souvenir de moi ?",
            doForgotPassword: "Mot de passe oublié ?",
            doLogIn: "Se connecter",
            legalNotice: "En cliquant sur « {0} », vous acceptez nos",
            termsOfUse: "Conditions d’utilisation",
            legalAnd: "et notre",
            privacyPolicy: "Politique de confidentialité"
        },
        ar: {
            loginAccountTitle: "تسجيل الدخول إلى حسابك",
            usernameOrEmail: "اسم المستخدم أو البريد الإلكتروني",
            rememberMe: "تذكرني؟",
            doForgotPassword: "هل نسيت كلمة المرور؟",
            doLogIn: "تسجيل الدخول",
            legalNotice: "بالنقر على «{0}» فإنك توافق على",
            termsOfUse: "شروط الاستخدام",
            legalAnd: "و",
            privacyPolicy: "سياسة الخصوصية"
        }
    })
    .build();

type I18n = typeof ofTypeI18n;

export { useI18n, type I18n };
