/**
 * Mensagens amigáveis para erros do Supabase Auth (PT-BR)
 */
export function getAuthErrorMessage(error: { message?: string; code?: string }): string {
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";

  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    return "Confirme seu e-mail antes de entrar. Abra o link que enviamos na sua caixa de entrada (verifique o spam).";
  }

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials")
  ) {
    return "E-mail ou senha incorretos. Se acabou de se cadastrar, confirme o e-mail primeiro ou use “Esqueceu a senha?”.";
  }

  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Este e-mail já está cadastrado. Faça login ou recupere a senha.";
  }

  if (msg.includes("password") && msg.includes("least")) {
    return "A senha não atende aos requisitos mínimos do sistema (use pelo menos 6 caracteres).";
  }

  if (msg.includes("signup is disabled")) {
    return "Cadastro temporariamente desativado. Entre em contato com o suporte.";
  }

  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  return error.message || "Ocorreu um erro. Tente novamente.";
}
