import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, LogBox,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";

// Suprime erro de token inválido que ocorre durante o fluxo de confirmação de email
LogBox.ignoreLogs(["AuthApiError: Invalid Refresh Token: Refresh Token Not Found"]);

export default function CadastroCandidato() {
  const navegacao = useNavigation();
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [erro, setErro] = useState("");
  const snapshotFormulario = useRef(null); // Preserva dados do form durante o fluxo de email

  // Estado do formulário de cadastro do candidato
  const [formulario, setFormulario] = useState({
    nome: "", idade: "", habilitacao: "", telefone: "",
    email: "", senha: "", confirmaSenha: "", objetivo: "",
    endereco: { cep: "", rua: "", bairro: "", numero: "", cidade: "", estado: "" },
    formacao: { escola: "", curso: "", status: "" },
    cursos: [], experiencias: [], perfil: "",
  });

  // Escuta eventos de autenticação para salvar dados no banco após confirmação de email
  useEffect(() => {
    const processarSalvamento = async (sessao) => {
      if (sessao && snapshotFormulario.current) {
        const snapshot = { ...snapshotFormulario.current };
        snapshotFormulario.current = null;

        try {
          const { error } = await supabase.from("cadastro_candidato").upsert(
            [{
              user_id: sessao.user.id,
              nome: snapshot.nome,
              idade: parseInt(snapshot.idade) || 0,
              habilitacao: snapshot.habilitacao,
              telefone: snapshot.telefone,
              email: snapshot.email,
              objetivo: snapshot.objetivo,
              endereco: snapshot.endereco,
              formacao: snapshot.formacao,
              cursos: snapshot.cursos,
              experiencias: snapshot.experiencias,
              perfil: snapshot.perfil,
            }],
            { onConflict: "user_id" }
          );

          if (error) throw error;
          setEmailConfirmado(true);
          setTimeout(() => navegacao.replace("HomeCandidato"), 2000);
        } catch (err) {
          if (err.message?.includes("Refresh Token Not Found")) return;
          console.error("Erro ao salvar candidato:", err.message);
        }
      }
    };

    // Verifica sessão existente (caso o link de confirmação já tenha sido clicado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) processarSalvamento(session);
    });

    // Escuta novos eventos de login (fluxo normal de confirmação)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evento, sessao) => {
      if ((evento === "SIGNED_IN" || evento === "INITIAL_SESSION") && sessao) {
        processarSalvamento(sessao);
      }
    });

    return () => subscription.unsubscribe();
  }, [navegacao]);

  // Aplica máscara de telefone no formato (00) 00000-0000
  const formatarTelefone = (valor) => {
    let tel = valor.replace(/\D/g, "");
    if (tel.length > 11) tel = tel.slice(0, 11);
    tel = tel.replace(/^(\d{2})(\d)/g, "($1) $2");
    tel = tel.replace(/(\d{5})(\d)/, "$1-$2");
    setFormulario({ ...formulario, telefone: tel });
  };

  // Valida formato básico de e-mail
  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Verifica se todos os campos de endereço estão preenchidos
  const validarEndereco = () => {
    const { rua, bairro, numero, cidade, estado, cep } = formulario.endereco;
    return rua.trim() && bairro.trim() && numero.trim() && cidade.trim() && estado.trim() && cep.trim().length === 8;
  };

  // Consulta o ViaCEP e preenche os campos de endereço automaticamente
  const buscarEnderecoPorCep = async (cep) => {
    if (cep.length !== 8) return;
    setCarregando(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (!dados.erro) {
        setFormulario({
          ...formulario,
          endereco: {
            ...formulario.endereco,
            rua: dados.logradouro || "",
            bairro: dados.bairro || "",
            cidade: dados.localidade || "",
            estado: dados.uf || "",
          },
        });
      } else {
        setErro("CEP inválido. Verifique o número.");
      }
    } catch {
      setErro("Não foi possível consultar o ViaCEP.");
    } finally {
      setCarregando(false);
    }
  };

  // Adiciona um novo curso vazio à lista
  const adicionarCurso = () =>
    setFormulario({ ...formulario, cursos: [...formulario.cursos, { instituicao: "", nome: "", ano: "" }] });

  // Atualiza um campo específico de um curso pelo índice
  const atualizarCurso = (indice, campo, valor) => {
    const novosCursos = [...formulario.cursos];
    novosCursos[indice][campo] = valor;
    setFormulario({ ...formulario, cursos: novosCursos });
  };

  // Adiciona uma nova experiência vazia à lista
  const adicionarExperiencia = () =>
    setFormulario({ ...formulario, experiencias: [...formulario.experiencias, { empresa: "", cargo: "", descricao: "" }] });

  // Atualiza um campo específico de uma experiência pelo índice
  const atualizarExperiencia = (indice, campo, valor) => {
    const novasExperiencias = [...formulario.experiencias];
    novasExperiencias[indice][campo] = valor;
    setFormulario({ ...formulario, experiencias: novasExperiencias });
  };

  // Valida os dados e dispara o cadastro via Supabase Auth
  const enviarCadastro = async () => {
    setErro("");
    if (!formulario.nome.trim() || !formulario.objetivo.trim())
      return setErro("Nome e Objetivo são obrigatórios.");
    if (!validarEmail(formulario.email)) return setErro("E-mail inválido.");
    if (formulario.telefone.length < 15) return setErro("Telefone incompleto.");
    if (!formulario.senha.trim() || formulario.senha !== formulario.confirmaSenha)
      return setErro("Senhas não conferem.");

    const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,9}$/;
    if (!regexSenha.test(formulario.senha))
      return setErro("Senha deve ter 7-9 caracteres, com Maiúscula, Minúscula, Número e Especial.");
    if (!validarEndereco()) return setErro("Endereço incompleto.");

    setCarregando(true);
    try {
      snapshotFormulario.current = formulario; // Congela o form antes do signup

      const { error } = await supabase.auth.signUp({
        email: formulario.email,
        password: formulario.senha,
        options: {
          data: { tipo: "candidato" },
          emailRedirectTo: "acheivaga://", // Deep link para retornar ao app após confirmação
        },
      });

      if (error) throw error;
      setEmailEnviado(true);
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setErro(error.message || "Erro no cadastro.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={estilos.areaSegura}>
        <ScrollView
          contentContainerStyle={estilos.container}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <Text style={estilos.titulo}>Achei Vaga — Currículo</Text>

          {/* Mensagens de erro e status */}
          {erro !== "" && <Text style={estilos.msgErro}>{erro}</Text>}
          {emailEnviado && !emailConfirmado && (
            <Text style={estilos.msgAviso}>
              📧 Enviamos um link de confirmação para {formulario.email}. Abra o e-mail e clique no link para ativar sua conta.
            </Text>
          )}

          {/* Dados pessoais */}
          <Text style={estilos.label}>Nome Completo *</Text>
          <TextInput style={estilos.input} placeholder="Seu nome completo" value={formulario.nome} onChangeText={(v) => setFormulario({ ...formulario, nome: v })} />

          <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ width: "22%" }}>
              <Text style={estilos.label}>Idade *</Text>
              <TextInput style={estilos.input} keyboardType="numeric" maxLength={2} value={formulario.idade} onChangeText={(v) => setFormulario({ ...formulario, idade: v.replace(/\D/g, "") })} />
            </View>
            <View style={{ width: "22%" }}>
              <Text style={estilos.label}>CNH</Text>
              <TextInput style={estilos.input} autoCapitalize="characters" maxLength={3} value={formulario.habilitacao} onChangeText={(v) => setFormulario({ ...formulario, habilitacao: v.toUpperCase() })} />
            </View>
            <View style={{ width: "52%" }}>
              <Text style={estilos.label}>Telefone *</Text>
              <TextInput style={estilos.input} keyboardType="numeric" placeholder="(00) 00000-0000" value={formulario.telefone} onChangeText={formatarTelefone} />
            </View>
          </View>

          <Text style={estilos.label}>E-mail *</Text>
          <TextInput style={estilos.input} keyboardType="email-address" autoCapitalize="none" value={formulario.email} onChangeText={(v) => setFormulario({ ...formulario, email: v.toLowerCase().trim() })} />

          {/* Campos de senha */}
          <Text style={estilos.label}>Senha (7-9 dígitos) *</Text>
          <View style={estilos.containerInput}>
            <TextInput style={estilos.inputFlex} secureTextEntry={!mostrarSenha} value={formulario.senha} onChangeText={(v) => setFormulario({ ...formulario, senha: v })} maxLength={9} />
            <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={estilos.botaoIcone}>
              <Ionicons name={mostrarSenha ? "eye-off" : "eye"} size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={estilos.label}>Confirmar Senha *</Text>
          <View style={estilos.containerInput}>
            <TextInput style={estilos.inputFlex} secureTextEntry={!mostrarConfirmarSenha} value={formulario.confirmaSenha} onChangeText={(v) => setFormulario({ ...formulario, confirmaSenha: v })} maxLength={9} />
            <TouchableOpacity onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)} style={estilos.botaoIcone}>
              <Ionicons name={mostrarConfirmarSenha ? "eye-off" : "eye"} size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={estilos.label}>Objetivo Profissional *</Text>
          <TextInput style={estilos.input} placeholder="Ex: Vendedor, Desenvolvedor..." value={formulario.objetivo} onChangeText={(v) => setFormulario({ ...formulario, objetivo: v })} />

          {/* Endereço com busca por CEP */}
          <Text style={estilos.tituloSecao}>Endereço</Text>
          <Text style={estilos.label}>CEP (apenas números) *</Text>
          <TextInput style={estilos.input} value={formulario.endereco.cep} onChangeText={(v) => setFormulario({ ...formulario, endereco: { ...formulario.endereco, cep: v.replace(/\D/g, "") } })} keyboardType="numeric" maxLength={8} onBlur={() => buscarEnderecoPorCep(formulario.endereco.cep)} />
          <TextInput style={estilos.input} placeholder="Rua" value={formulario.endereco.rua} onChangeText={(v) => setFormulario({ ...formulario, endereco: { ...formulario.endereco, rua: v } })} />
          <TextInput style={estilos.input} placeholder="Bairro" value={formulario.endereco.bairro} onChangeText={(v) => setFormulario({ ...formulario, endereco: { ...formulario.endereco, bairro: v } })} />
          <TextInput style={estilos.input} placeholder="Número" value={formulario.endereco.numero} onChangeText={(v) => setFormulario({ ...formulario, endereco: { ...formulario.endereco, numero: v } })} />
          <TextInput style={estilos.input} placeholder="Cidade" value={formulario.endereco.cidade} onChangeText={(v) => setFormulario({ ...formulario, endereco: { ...formulario.endereco, cidade: v } })} />
          <TextInput style={estilos.input} placeholder="Estado" value={formulario.endereco.estado} onChangeText={(v) => setFormulario({ ...formulario, endereco: { ...formulario.endereco, estado: v } })} />

          {/* Formação escolar */}
          <Text style={estilos.tituloSecao}>Escolaridade</Text>
          <TextInput style={estilos.input} placeholder="Escola/Faculdade" value={formulario.formacao.escola} onChangeText={(v) => setFormulario({ ...formulario, formacao: { ...formulario.formacao, escola: v } })} />
          <TextInput style={estilos.input} placeholder="Curso" value={formulario.formacao.curso} onChangeText={(v) => setFormulario({ ...formulario, formacao: { ...formulario.formacao, curso: v } })} />
          <View style={[estilos.input, { padding: 0, justifyContent: "center", height: 55 }]}>
            <Picker selectedValue={formulario.formacao.status} onValueChange={(v) => setFormulario({ ...formulario, formacao: { ...formulario.formacao, status: v } })} style={{ width: "100%", height: "100%" }} mode="dropdown">
              <Picker.Item label="Concluído" value="concluído" />
              <Picker.Item label="Cursando" value="cursando" />
              <Picker.Item label="Trancado" value="trancado" />
            </Picker>
          </View>

          {/* Cursos e certificados */}
          <Text style={estilos.tituloSecao}>Cursos e Certificados</Text>
          {formulario.cursos.map((curso, indice) => (
            <View key={indice} style={estilos.itemContainer}>
              <TextInput style={estilos.input} placeholder="Nome do Curso" onChangeText={(v) => atualizarCurso(indice, "nome", v)} />
              <TextInput style={estilos.input} placeholder="Ano" keyboardType="numeric" onChangeText={(v) => atualizarCurso(indice, "ano", v)} />
            </View>
          ))}
          <TouchableOpacity style={estilos.botaoAdicionar} onPress={adicionarCurso}>
            <Text style={estilos.textoAdicionar}>+ Adicionar Curso</Text>
          </TouchableOpacity>

          {/* Experiências profissionais */}
          <Text style={estilos.tituloSecao}>Experiências</Text>
          {formulario.experiencias.map((exp, indice) => (
            <View key={indice} style={estilos.itemContainer}>
              <TextInput style={estilos.input} placeholder="Empresa" onChangeText={(v) => atualizarExperiencia(indice, "empresa", v)} />
              <TextInput style={estilos.input} placeholder="Cargo" onChangeText={(v) => atualizarExperiencia(indice, "cargo", v)} />
              <TextInput style={[estilos.input, { height: 80 }]} multiline placeholder="Breve descrição" onChangeText={(v) => atualizarExperiencia(indice, "descricao", v)} />
            </View>
          ))}
          <TouchableOpacity style={estilos.botaoAdicionar} onPress={adicionarExperiencia}>
            <Text style={estilos.textoAdicionar}>+ Adicionar Experiência</Text>
          </TouchableOpacity>

          {/* Perfil profissional */}
          <Text style={estilos.tituloSecao}>Perfil Profissional</Text>
          <TextInput style={[estilos.input, { height: 100 }]} multiline placeholder="Descreva seu perfil, habilidades e objetivos..." value={formulario.perfil} onChangeText={(v) => setFormulario({ ...formulario, perfil: v })} />

          {/* Botão de envio */}
          <TouchableOpacity style={[estilos.botaoSalvar, carregando && { backgroundColor: "#ccc" }]} onPress={carregando ? null : enviarCadastro} disabled={carregando}>
            {carregando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBotao}>Cadastrar</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  areaSegura: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },
  titulo: { fontSize: 26, fontWeight: "bold", color: "#0D47A1", textAlign: "center", marginBottom: 20 },
  tituloSecao: { fontSize: 18, fontWeight: "bold", color: "#0D47A1", marginTop: 25, marginBottom: 15 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 5, marginTop: 10 },
  input: { height: 50, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 15, marginBottom: 12, backgroundColor: "#f9f9f9" },
  itemContainer: { marginBottom: 15, padding: 10, backgroundColor: "#f1f1f1", borderRadius: 8 },
  botaoAdicionar: { padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#2196F3", borderStyle: "dashed" },
  textoAdicionar: { color: "#2196F3", fontWeight: "bold" },
  botaoSalvar: { backgroundColor: "#1B5E20", height: 55, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 40 },
  textoBotao: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  containerInput: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 12, backgroundColor: "#f9f9f9" },
  inputFlex: { flex: 1, height: 50, paddingHorizontal: 15 },
  botaoIcone: { padding: 10 },
  msgErro: { color: "#ef4444", textAlign: "center", marginBottom: 10, fontWeight: "bold" },
  msgAviso: { backgroundColor: "#e8f5e9", padding: 15, borderRadius: 8, marginBottom: 15, color: "#2e7d32", lineHeight: 20 },
});
