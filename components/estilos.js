/**
 * Retorna cor ou texto descritivo com base no percentual de compatibilidade.
 * Tipo "cor": retorna um código hexadecimal (verde, amarelo, laranja ou vermelho).
 * Tipo "texto": retorna uma descrição legível do nível de compatibilidade.
 */
export const estilos = (valor, tipo = "cor") => {
  if (tipo === "cor") {
    if (valor >= 75) return "#22c55e"; // Verde — excelente compatibilidade
    if (valor >= 50) return "#eab308"; // Amarelo — boa compatibilidade
    if (valor >= 25) return "#f97316"; // Laranja — compatibilidade média
    return "#ef4444";                  // Vermelho — baixa compatibilidade
  }

  if (tipo === "texto") {
    if (valor >= 75) return "Excelente compatibilidade";
    if (valor >= 50) return "Boa compatibilidade";
    if (valor >= 25) return "Média compatibilidade";
    return "Baixa compatibilidade";
  }
};
