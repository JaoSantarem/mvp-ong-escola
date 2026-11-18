import { useState } from "react";
import { postAuth, registrationError } from "../services/auth.js";

// Estado dos formulários de login, cadastro da organização e primeira senha.
export function useAuthForm({ setupToken, setSetupToken, setAuth }, error, setError) {
  const [setup, setSetup] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [org, setOrg] = useState("");
  const [kind, setKind] = useState("ONG");
  const [loginName, setLoginName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [firstPasswordSetup, setFirstPasswordSetup] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(false);

  async function registerOrganization() {
    await postAuth(
      "setup",
      {
        organization: org,
        organizationType: kind,
        login: loginName,
        email,
        password,
      },
      registrationError,
    );
    setLoginId(loginName);
    setRegistered(true);
    setPassword("");
  }

  async function saveFirstPassword() {
    if (password !== passwordConfirmation) throw Error("As senhas não coincidem.");
    await postAuth(
      "auth/password-setup",
      {
        identifier: loginId.trim(),
        setupToken,
        password,
        confirmation: passwordConfirmation,
      },
      "Não foi possível definir a senha.",
    );
    sessionStorage.removeItem("ong-setup-invite");
    setSetupToken("");
    setFirstPasswordSetup(false);
    setPassword("");
    setPasswordConfirmation("");
    setPasswordNotice(true);
  }

  async function checkInvitation() {
    if (!setupToken)
      throw Error(
        "Para definir a primeira senha, abra o link de primeiro acesso fornecido pelo administrador e informe seu login.",
      );
    const result = await postAuth(
      "auth/password-setup/check",
      {
        identifier: loginId.trim(),
        setupToken,
      },
      "Convite inválido ou expirado.",
    );
    if (!result.passwordSetupRequired) return false;
    setFirstPasswordSetup(true);
    setPasswordNotice(false);
    setPassword("");
    setPasswordConfirmation("");
    return true;
  }

  async function login() {
    const result = await postAuth(
      "auth/login",
      {
        identifier: loginId.trim(),
        password,
      },
      (status) => `Não foi possível entrar (HTTP ${status}).`,
    );
    sessionStorage.setItem("ong-auth", result.accessToken);
    setAuth(result.accessToken);
  }

  async function sign(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (setup) return await registerOrganization();
      if (firstPasswordSetup) return await saveFirstPassword();
      if (!password.trim() && (await checkInvitation())) return;
      await login();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return {
    setup,
    setSetup,
    registered,
    setRegistered,
    sign,
    busy,
    error,
    org,
    setOrg,
    kind,
    setKind,
    loginName,
    setLoginName,
    loginId,
    setLoginId,
    email,
    setEmail,
    password,
    setPassword,
    firstPasswordSetup,
    setFirstPasswordSetup,
    passwordConfirmation,
    setPasswordConfirmation,
    passwordNotice,
  };
}
