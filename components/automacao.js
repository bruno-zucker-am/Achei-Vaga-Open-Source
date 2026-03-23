/**
 * Motor de automação do processo seletivo.
 * Filtra candidatos por nicho, calcula score de compatibilidade,
 * e opcionalmente seleciona e agenda entrevistas automaticamente.
 *
 * @param {Array} candidatos - Lista de candidatos da cidade.
 * @param {Array} vagasAtivas - Vagas abertas da empresa.
 * @param {Array} horariosDisponiveis - Slots de horário livres da empresa.
 * @param {Function} calcularScore - Função que calcula compatibilidade candidato x vaga.
 * @param {Function} salvarNoBanco - Função que persiste dados (seleção, entrevista).
 * @returns {Array} logs - Registro das ações realizadas por candidato.
 */
export const executarAutomacao = async (
  candidatos,
  vagasAtivas,
  horariosDisponiveis,
  calcularScore,
  salvarNoBanco
) => {
  const logs = [];

  // Agrupa candidatos por nicho para facilitar a filtragem por vaga
  const candidatosPorNicho = candidatos.reduce((agrupado, candidato) => {
    if (!agrupado[candidato.nicho]) agrupado[candidato.nicho] = [];
    agrupado[candidato.nicho].push(candidato);
    return agrupado;
  }, {});

  // Processa cada vaga ativa da empresa
  for (const vaga of vagasAtivas) {
    let candidatosDoNicho = candidatosPorNicho[vaga.nicho] || [];

    // Calcula e ordena por score — os mais compatíveis primeiro
    candidatosDoNicho.forEach(c => c.score = calcularScore(c, vaga));
    candidatosDoNicho.sort((a, b) => b.score - a.score);

    // Com auto seleção + auto agendamento: processa apenas os 2 melhores
    const limite = (vaga.autoSelecao && vaga.autoAgendar) ? 2 : candidatosDoNicho.length;
    const candidatosParaProcessar = candidatosDoNicho.slice(0, limite);

    for (const candidato of candidatosParaProcessar) {
      let statusFinal = 'processado';

      // Auto Seleção: marca como selecionado se atingir o nível mínimo configurado
      if (vaga.autoSelecao && candidato.score >= vaga.nivelAutoSelecao) {
        await salvarNoBanco('selecionado', { candidatoId: candidato.id, vagaId: vaga.id });
        statusFinal = 'selecionado';

        // Auto Agendamento: agenda entrevista se também atingir o nível de agendamento
        if (vaga.autoAgendar && candidato.score >= vaga.nivelAutoAgendar) {
          const horarioLivre = horariosDisponiveis.find(h => h.vagaId === vaga.id && h.livre);

          if (horarioLivre) {
            await salvarNoBanco('entrevista', {
              candidatoId: candidato.id,
              vagaId: vaga.id,
              dataHora: horarioLivre.dataHora
            });
            horarioLivre.livre = false; // Marca o horário como ocupado localmente
            statusFinal = 'agendado';
          } else {
            statusFinal = 'fila_pendente'; // Sem horário disponível no momento
          }
        }
      }

      logs.push({ nome: candidato.nome, nicho: vaga.nicho, status: statusFinal });
    }
  }

  return logs;
};
