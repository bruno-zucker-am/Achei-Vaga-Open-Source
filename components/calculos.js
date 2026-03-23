/**
 * Calcula o percentual de compatibilidade entre um candidato e uma vaga de emprego.
 * Compara campos como nicho, cargo, endereço, formação, cursos e experiência.
 * Retorna um valor de 0 a 100.
 */
export const calculos = (candidato, perfilVaga) => {
  if (!candidato || !perfilVaga) return 0;

  let pontosGanhos = 0;
  let totalPontosPossiveis = 0;

  // Nicho: compara os nichos do candidato com os da vaga (peso 20)
  if (perfilVaga.nichos && perfilVaga.nichos.length > 0) {
    totalPontosPossiveis += 20;
    if (JSON.stringify(candidato.nichos) === JSON.stringify(perfilVaga.nichos)) {
      pontosGanhos += 20;
    }
  }

  // Cargo: compara o objetivo do candidato com o cargo da vaga (peso 20)
  if (perfilVaga.cargo) {
    totalPontosPossiveis += 20;
    if (candidato.objetivo === perfilVaga.cargo || candidato.cargo === perfilVaga.cargo) {
      pontosGanhos += 20;
    }
  }

  // Endereço: verifica se cidade e estado coincidem (peso 10)
  if (perfilVaga.endereco?.cidade && perfilVaga.endereco?.estado) {
    totalPontosPossiveis += 10;
    if (
      candidato.endereco?.cidade === perfilVaga.endereco.cidade &&
      candidato.endereco?.estado === perfilVaga.endereco.estado
    ) {
      pontosGanhos += 10;
    }
  }

  // Idade: verifica se o candidato informou a idade (peso 5)
  if (perfilVaga.idade) {
    totalPontosPossiveis += 5;
    if (candidato.idade) {
      pontosGanhos += 5;
    }
  }

  // Habilitação: verifica se o candidato possui CNH (peso 5)
  if (perfilVaga.habilitacao) {
    totalPontosPossiveis += 5;
    if (candidato.habilitacao) {
      pontosGanhos += 5;
    }
  }

  // Formação: verifica se candidato possui escola ou curso registrado (peso 15)
  if (perfilVaga.formacao) {
    totalPontosPossiveis += 15;
    if (candidato.formacao?.escola || candidato.formacao?.curso) {
      pontosGanhos += 15;
    }
  }

  // Cursos: verifica se candidato possui cursos cadastrados (peso 5)
  if (perfilVaga.cursos && perfilVaga.cursos?.length > 0) {
    totalPontosPossiveis += 5;
    if (candidato.cursos && candidato.cursos?.length > 0) {
      pontosGanhos += 5;
    }
  }

  // Experiência: verifica se candidato possui experiências registradas (peso 20)
  if (perfilVaga.experiencias && perfilVaga.experiencias?.length > 0) {
    totalPontosPossiveis += 20;
    if (candidato.experiencias && candidato.experiencias?.length > 0) {
      pontosGanhos += 20;
    }
  }

  // Retorna 0 se não houver critérios, ou calcula a porcentagem arredondada
  if (totalPontosPossiveis === 0) return 0;
  return Math.round((pontosGanhos / totalPontosPossiveis) * 100);
};
