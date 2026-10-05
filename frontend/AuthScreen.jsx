import React from "react";

export default function AuthScreen({
  setup, setSetup, registered, setRegistered, sign, busy, error, org, setOrg,
  kind, setKind, loginName, setLoginName, loginId, setLoginId, email, setEmail,
  password, setPassword, firstPasswordSetup, setFirstPasswordSetup, passwordConfirmation, setPasswordConfirmation, passwordNotice
}) {
  if (registered) {
    return (
      <main className="auth-screen">
        <section className="auth-intro">
          <div className="auth-brand"><span className="auth-mark">GS</span><span>Gestão Social<small>Organização e impacto em um só lugar</small></span></div>
          <div className="auth-message"><span className="eyebrow">CADASTRO CONCLUÍDO</span><h1>Um novo começo para sua organização.</h1><p>Seu espaço de gestão já está criado. Entre para começar a organizar oficinas, participantes e projetos.</p></div>
          <small className="auth-foot">Plataforma de gestão para ONGs e escolas</small>
        </section>
        <section className="auth-main"><div className="auth-card auth-success">
          <span className="success-mark">✓</span><span className="eyebrow">TUDO PRONTO</span>
          <h2>Parabéns pela criação!</h2>
          <p className="auth-subtitle"><b>{org}</b> foi cadastrada. Seu login de administrador é <b>{loginName}</b>. Use seu login ou e-mail e a senha criada para acessar.</p>
          <button className="auth-submit" onClick={()=>{setRegistered(false);setSetup(false);setLoginId(loginName);setPassword("");}}>Voltar para o login</button>
        </div></section>
      </main>
    );
  }
  return (
    <main className="auth-screen">
      <section className="auth-intro">
        <div className="auth-brand"><span className="auth-mark">GS</span><span>Gestão Social<small>Organização e impacto em um só lugar</small></span></div>
        <div className="auth-message">
          <span className="eyebrow">GESTÃO PARA QUEM TRANSFORMA</span>
          <h1>Mais tempo para cuidar do que importa.</h1>
          <p>Organize oficinas, acompanhe participantes e mantenha projetos e recursos conectados.</p>
          <div className="auth-points"><span><i>✓</i> Gestão acadêmica</span><span><i>✓</i> Controle financeiro</span><span><i>✓</i> Prestação de contas</span></div>
        </div>
        <small className="auth-foot">Plataforma de gestão para ONGs e escolas</small>
      </section>
      <section className="auth-main"><div className="auth-card">
        <div className="auth-mobile-brand"><span className="auth-mark">GS</span> Gestão Social</div>
        <span className="eyebrow">{setup ? "VAMOS COMEÇAR" : firstPasswordSetup ? "PRIMEIRO ACESSO" : "BEM-VINDA(O) DE VOLTA"}</span>
        <h2>{setup ? "Crie sua organização" : firstPasswordSetup ? "Defina sua senha" : "Entre na sua conta"}</h2>
        <p className="auth-subtitle">{setup ? "Cadastre sua organização e crie o primeiro acesso de administrador." : firstPasswordSetup ? <>Crie uma senha para <b>{loginId}</b>. Depois, volte para entrar na sua conta.</> : "Acesse o espaço de trabalho da sua organização. Para o primeiro acesso, abra o link enviado pelo administrador."}</p>
        {passwordNotice && !setup && !firstPasswordSetup && <div className="auth-success-message" role="status">Senha criada com sucesso. Agora entre com seu login e a nova senha.</div>}
        <form className="auth-form" onSubmit={sign}>
          {setup && <>
            <label>Nome da organização<input autoFocus required value={org} onChange={e=>setOrg(e.target.value)} placeholder="Ex.: Associação Caminhos"/></label>
            <label>Tipo de organização<select value={kind} onChange={e=>setKind(e.target.value)}><option value="ONG">ONG</option><option value="ESCOLA">Escola</option></select></label>
            <label>Login<input required minLength={3} autoComplete="username" value={loginName} onChange={e=>setLoginName(e.target.value.trim())} placeholder="Ex.: admin.caminhos"/></label>
            <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@organizacao.org"/></label>
          </>}
          {!setup && !firstPasswordSetup && <label>Login ou e-mail<input autoFocus type="text" autoComplete="username" required value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="Seu login ou e-mail"/></label>}
          {(!setup && firstPasswordSetup) && <input type="hidden" autoComplete="username" value={loginId}/>}
          {!setup && !firstPasswordSetup && <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha (ou deixe em branco no primeiro acesso)"/></label>}
          {(setup || firstPasswordSetup) && <label>{firstPasswordSetup ? "Nova senha" : "Senha"}<input type="password" autoComplete="new-password" minLength="10" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 10 caracteres"/></label>}
          {firstPasswordSetup && <label>Confirme a senha<input type="password" autoComplete="new-password" minLength="10" required value={passwordConfirmation} onChange={e=>setPasswordConfirmation(e.target.value)} placeholder="Digite a senha novamente"/></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? "Aguarde…" : setup ? "Criar organização" : firstPasswordSetup ? "Continuar" : password ? "Entrar" : "Continuar"}</button>
        </form>
        <div className="auth-switch">{setup ? "Já tem acesso?" : firstPasswordSetup ? "Prefere voltar?" : "Ainda não cadastrou sua organização?"}<button type="button" onClick={()=>{if(firstPasswordSetup){setFirstPasswordSetup(false)}else{setSetup(!setup)}setRegistered(false)}}>{setup || firstPasswordSetup ? "Fazer login" : "Criar cadastro"}</button></div>
        <div className="auth-secure"><span>▣</span> Seus dados são acessados com segurança pela sua conta.</div>
      </div></section>
    </main>
  );
}
