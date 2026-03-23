// Edição de perfil do candidato — permite atualizar dados pessoais, endereço, formação, cursos, experiências e senha.
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator, 
} from "react-native";

// Limpa cache node: npm cache clean --force
// Inicia expo ipv4: npx expo start -c --lan
// Limpa cache do Package: npx expo start --reset-cache --lan
// Bilda o apk: eas build --platform android --profile preview

import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "AuthApiError: Invalid Refresh Token: Refresh Token Not Found",
]);

export default function EditarPerfilCandidato() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [form, setForm] = useState({
    nichos: [],
    nome: "",
    idade: "",
    habilitacao: "",
    telefone: "",
    email: "",
    senha: "",
    confirmaSenha: "",
    objetivo: "",
    endereco: {
      cep: "",
      rua: "",
      bairro: "",
      numero: "",
      cidade: "",
      estado: "",
    },
    formacao: { escola: "", curso: "", status: "" },
    cursos: [],
    experiencias: [],
    perfil: "",
  });

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          console.log("✅ Conectado como:", session.user.id);

          const { data, error: dbError } = await supabase
            .from("cadastro_candidato")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (dbError) throw dbError;

          if (data) {
            setForm({
              nichos: data.nichos || [],
              foto_url: data.foto_url || "",
              nome: data.nome || "",
              idade: data.idade || "",
              habilitacao: data.habilitacao || "",
              email: session.user.email || "",
              telefone: data.telefone || "",
              senha: "",
              confirmaSenha: "",
              objetivo: data.objetivo || "",
              endereco: {
                cep: data.endereco?.cep || "",
                rua: data.endereco?.rua || "",
                bairro: data.endereco?.bairro || "",
                numero: data.endereco?.numero || "",
                cidade: data.endereco?.cidade || "",
                estado: data.endereco?.estado || "",
              },
              formacao: {
                escola: data.formacao?.escola || "",
                curso: data.formacao?.curso || "",
                status: data.formacao?.status || "",
              },
              cursos: data.cursos || [],
              experiencias: data.experiencias || [],
              perfil: data.perfil || "",
            });
          }
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("🕵️ Erro no processo:", e.message);
        }
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // 2. FUNÇÃO SALVAR (A que faz a mágica)
  const salvarAlteracoes = async () => {
    setLoading(true);
    setErro("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada.");

      // A) ATUALIZAR DADOS NA TABELA
      const { error: dbError } = await supabase
        .from("cadastro_candidato")
        .update({
          nichos: form.nichos,
          nome: form.nome,
          idade: form.idade,
          habilitacao: form.habilitacao,
          telefone: form.telefone,
          email: form.email,
          objetivo: form.objetivo,
          endereco: {
            cep: form.endereco.cep,
            rua: form.endereco.rua,
            bairro: form.endereco.bairro,
            numero: form.endereco.numero,
            cidade: form.endereco.cidade,
            estado: form.endereco.estado,
          },
          formacao: {
            escola: form.formacao.escola,
            curso: form.formacao.curso,
            status: form.formacao.status,
          },
          cursos: form.cursos, // Enviando o array direto
          experiencias: form.experiencias, // Enviando o array direto
          perfil: form.perfil,
        })
        .eq("user_id", session.user.id);

      if (dbError) throw dbError;

      // B) ATUALIZAR SENHA (Se o usuário digitou algo na senha)
      if (form.senha !== "") {
        if (form.senha !== form.confirmaSenha) {
          throw new Error("As senhas não conferem.");
        }
        const { error: authError } = await supabase.auth.updateUser({
          password: form.senha,
        });
        if (authError) throw authError;
      }

      setMensagem("Perfil atualizado com sucesso ✅");

      // ⏱️ espera antes de sair
      setTimeout(() => {
        navigation.goBack();
      }, 3000);

    } catch (error) {
      setErro(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnderecoByCep = async (cep) => {
    if (cep.length !== 8) return;
    setLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm({
          ...form,
          endereco: {
            ...form.endereco,
            rua: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
          },
        });
      } else {
        setErro("CEP inválido. Verifique o número.");
      }
    } catch (error) {
      setErro("Não foi possível consultar o ViaCEP.");
    } finally {
      setLoading(false);
    }
  };


  {
    /*Handles de Atualização desse arquivo */
  }

  // Atualiza Nome
  const atualizarNome = (value) =>
    setForm({
      ...form,
      nome: value,
    });

  // Atualiza E-mail
  const atualizarEmail = (value) => {
    setForm({
      ...form,
      email: value,
    });
  };

  // Atualiza Idade
  const atualizarIdade = (value) => {
    setForm({
      ...form,
      idade: value,
    });
  };

  // Atualiza Habilitação
  const atualizarCNH = (value) => {
    setForm({
      ...form,
      habilitacao: value,
    });
  };

  // Atualiza Tefelefone
  const atualizarTelefone = (value) => {
    setForm({
      ...form,
      telefone: value,
    });
  };

  // Atualiza Senha
  const atualizarSenha = (field, value) => {
    setForm({
      ...form,
      [field]: value,
    });
  };

  // Atualiza Objetivo
  const atualizarObjetivo = (value) => {
    setForm({
      ...form,
      objetivo: value,
    });
  };

  // Atualiza Endereço
  const atualizarEndereco = (field, value) => {
    setForm({
      ...form,
      endereco: {
        ...form.endereco,
        [field]: value,
      },
    });
  };

  // Atualiza Formação Educacional
  const atualizarFormacao = (field, value) => {
    setForm({
      ...form,
      formacao: {
        ...form.formacao,
        [field]: value,
      },
    });
  };



  // Adiciona novo curso
  const adicionarCurso = () =>
    setForm({
      ...form,
      cursos: [...form.cursos, { instituicao: "", nome: "", ano: "" }],
    });

  // Atualiza novo curso
  const atualizarCurso = (index, field, value) => {
    const novoCurso = [...form.cursos];
    novoCurso[index][field] = value;
    setForm({ ...form, cursos: novoCurso });
  };

  // Adiciona nova experiência
  const adicionarExperiencia = () =>
    setForm({
      ...form,
      experiencias: [
        ...form.experiencias,
        { empresa: "", cargo: "", descricao: "" },
      ],
    });

  // Atualiza Experiência
  const atualizarExperiencia = (index, field, value) => {
    const novaExperiencia = [...form.experiencias];
    novaExperiencia[index][field] = value;
    setForm({ ...form, experiencias: novaExperiencia });
  };

  // Atualiza Perfil Profissional
  const atualizarPerfil = (value) => {
    setForm({
      ...form,
      perfil: value,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: "#0a0b10",
        paddingBottom: 60, // Aumentado levemente para respiro final
      }}
      style={{ backgroundColor: "#0a0b10" }}
    >
      <View style={styles.container}>
        {/* Botão Voltar Neon */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={{
            color: "#00f2ff",
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1
          }}>
            ← VOLTAR
          </Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Editar Perfil</Text>

        {erro !== "" && <Text style={styles.msgErro}>{erro}</Text>}

        {/* BLOCO 1: Dados Pessoais */}
        <View style={{ marginBottom: 25 }}>
          <Text
            style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}
          >
            Informações Pessoais:
          </Text>

          {/* Nome */}
          <View style={[styles.inputContainer, styles.borderAzul]}>
            <TextInput
              style={styles.input}
              value={form.nome}
              placeholder="Seu Nome Completo"
              placeholderTextColor="#64748b"
              onChangeText={(v) => atualizarNome(v)}
            />
          </View>

          {/* Email */}
          <View style={[styles.inputContainer, styles.borderAzul]}>
            <TextInput
              style={styles.input}
              value={form.email}
              placeholder="E-mail"
              placeholderTextColor="#64748b"
              onChangeText={(v) => atualizarEmail(v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* LINHA COM IDADE E HABILITAÇÃO */}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View
              style={[
                styles.inputContainer,
                styles.borderAzul,
                { width: "48%" },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Idade"
                placeholderTextColor="#64748b"
                value={form.idade}
                onChangeText={(v) => atualizarIdade(v)}
                keyboardType="numeric"
              />
            </View>
            <View
              style={[
                styles.inputContainer,
                styles.borderAzul,
                { width: "48%" },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Habilitação"
                placeholderTextColor="#64748b"
                value={form.habilitacao}
                onChangeText={(v) => atualizarCNH(v)}
                autoCapitalize="characters"
              />
            </View>
          </View>
          {/* ↑ ESSA VIEW ACIMA FOI FECHADA AGORA, O TELEFONE VAI PRA BAIXO */}

          {/* Telefone ocupando a linha debaixo sozinho */}
          <View style={[styles.inputContainer, styles.borderAzul]}>
            <TextInput
              style={styles.input}
              placeholder="11981495031"
              placeholderTextColor="#64748b"
              value={form.telefone || ""}
              onChangeText={(v) => atualizarTelefone(v)}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputContainer, styles.borderAzul]}>
            <TextInput
              style={styles.input}
              placeholder="Nova Senha (deixe em branco para manter)"
              placeholderTextColor="#64748b"
              value={form.senha || ""}
              onChangeText={(v) => atualizarSenha("senha", v)}
              secureTextEntry={!mostrarSenha}
            />

            <TouchableOpacity
              onPress={() => setMostrarSenha(!mostrarSenha)}
              style={styles.eyeIcon}
            >
              <Text style={{ fontSize: 10, color: "#00f2ff", fontWeight: "bold" }}>
                {mostrarSenha ? "OCULTAR" : "MOSTRAR"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, styles.borderAzul]}>
            <TextInput
              style={styles.input}
              placeholder="Confirmar Senha"
              placeholderTextColor="#64748b"
              value={form.confirmaSenha || ""}
              onChangeText={(v) => atualizarSenha("confirmaSenha", v)}
              secureTextEntry={!mostrarSenha}
            />
          </View>
        </View>

        {/* BLOCO: Objetivo Profissional */}
        <View style={{ marginBottom: 25 }}>
          <Text
            style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}
          >
            Objetivo Profissional:
          </Text>
          <View
            style={[
              styles.inputContainer,
              styles.borderLaranja, // Mantendo a cor que você escolheu
              { height: "auto" },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  minHeight: 100,
                  textAlignVertical: "top",
                  paddingVertical: 12,
                },
              ]}
              placeholder="Descreva seu objetivo profissional..."
              placeholderTextColor="#64748b"
              value={form.objetivo || ""} // Sempre o seguro contra undefined
              onChangeText={(v) => atualizarObjetivo(v)}
              multiline={true}
              numberOfLines={4}
            />
          </View>
        </View>

        {/* BLOCO: Endereço */}
        <View style={{ marginBottom: 25 }}>
          <Text style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}>
            Endereço:
          </Text>

          {/* CEP sozinho */}
          <View style={[styles.inputContainer, styles.borderVerde]}>
            <TextInput
              style={styles.input}
              placeholder="CEP"
              placeholderTextColor="#64748b"
              value={form.endereco?.cep || ""}
              onChangeText={(v) => atualizarEndereco("cep", v)}
              keyboardType="numeric"
              maxLength={8}
              onBlur={() => fetchEnderecoByCep(form.endereco.cep)}
            />
          </View>

          {/* Rua + Número */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View
              style={[
                styles.inputContainer,
                styles.borderVerde,
                { width: "70%" },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Rua"
                placeholderTextColor="#64748b"
                value={form.endereco?.rua || ""}
                onChangeText={(v) => atualizarEndereco("rua", v)}
              />
            </View>

            <View
              style={[
                styles.inputContainer,
                styles.borderVerde,
                { width: "26%" },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Número"
                placeholderTextColor="#64748b"
                value={form.endereco?.numero || ""}
                onChangeText={(v) => atualizarEndereco("numero", v)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Bairro sozinho */}
          <View style={[styles.inputContainer, styles.borderVerde]}>
            <TextInput
              style={styles.input}
              placeholder="Bairro"
              placeholderTextColor="#64748b"
              value={form.endereco?.bairro || ""}
              onChangeText={(v) => atualizarEndereco("bairro", v)}
            />
          </View>

          {/* Cidade + UF (Manaus AM) */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View
              style={[
                styles.inputContainer,
                styles.borderVerde,
                { width: "72%" },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Cidade"
                placeholderTextColor="#64748b"
                value={form.endereco?.cidade || ""}
                onChangeText={(v) => atualizarEndereco("cidade", v)}
              />
            </View>

            <View
              style={[
                styles.inputContainer,
                styles.borderVerde,
                { width: "24%" },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="UF"
                placeholderTextColor="#64748b"
                value={form.endereco?.estado || ""}
                onChangeText={(v) => atualizarEndereco("estado", v)}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* BLOCO: Formação */}
        <View style={{ marginBottom: 25 }}>
          <Text
            style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}
          >
            Formação Educacional:
          </Text>
          <View style={[styles.inputContainer, styles.borderRoxo]}>
            <TextInput
              style={styles.input}
              placeholder="Escola / Instituição"
              placeholderTextColor="#64748b"
              value={form.formacao?.escola}
              onChangeText={(v) => atualizarFormacao("escola", v)}
            />
          </View>
          <View style={[styles.inputContainer, styles.borderRoxo]}>
            <TextInput
              style={styles.input}
              placeholder="Curso"
              placeholderTextColor="#64748b"
              value={form.formacao?.curso}
              onChangeText={(v) => atualizarFormacao("curso", v)}
            />
          </View>
          <View style={[styles.inputContainer, styles.borderRoxo]}>
            <TextInput
              style={styles.input}
              placeholder="Status da Formação"
              placeholderTextColor="#64748b"
              value={form.formacao?.status}
              onChangeText={(v) => atualizarFormacao("status", v)}
            />
          </View>
        </View>

        {/* Cursos de Qualificação */}
        <View style={{ marginBottom: 10 }}>
          <Text
            style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}
          >
            Cursos de Qualificação:
          </Text>
          {form.cursos.map((c, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <View style={[styles.inputContainer, styles.borderRoxo]}>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do Curso"
                  placeholderTextColor="#64748b"
                  value={c.nome}
                  onChangeText={(v) => atualizarCurso(index, "nome", v)}
                />
              </View>

              <View style={[styles.inputContainer, styles.borderRoxo]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ano"
                  placeholderTextColor="#64748b"
                  value={c.ano}
                  onChangeText={(v) => atualizarCurso(index, "ano", v)}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={adicionarCurso} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
            <Text style={{ color: "#00f2ff", fontWeight: "bold" }}>
              + Adicionar Curso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Experiencia */}
        <View style={{ marginBottom: 10 }}>
          <Text
            style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}
          >
            Experiência Profissional:
          </Text>
          {form.experiencias.map((c, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <View style={[styles.inputContainer, styles.borderRoxo]}>
                <TextInput
                  style={styles.input}
                  placeholder="Empresa"
                  placeholderTextColor="#64748b"
                  value={c.empresa}
                  onChangeText={(v) => atualizarExperiencia(index, "empresa", v)}
                />
              </View>

              <View style={[styles.inputContainer, styles.borderRoxo]}>
                <TextInput
                  style={styles.input}
                  placeholder="Cargo"
                  placeholderTextColor="#64748b"
                  value={c.cargo}
                  onChangeText={(v) => atualizarExperiencia(index, "cargo", v)}
                />
              </View>

              <View style={[styles.inputContainer, styles.borderRoxo]}>
                <TextInput
                  style={styles.input}
                  placeholder="Descrição"
                  placeholderTextColor="#64748b"
                  value={c.descricao}
                  onChangeText={(v) => atualizarExperiencia(index, "descricao", v)}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={adicionarExperiencia} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
            <Text style={{ color: "#00f2ff", fontWeight: "bold" }}>
              + Adicionar Experiência
            </Text>
          </TouchableOpacity>
        </View>

        {/* BLOCO 7: Perfil */}
        <View style={{ marginBottom: 25 }}>
          <Text
            style={{ color: "#00f2ff", fontWeight: "600", marginBottom: 12 }}
          >
            Perfil Profissional:
          </Text>
          <View
            style={[
              styles.inputContainer,
              styles.borderAzul,
              { height: "auto" },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  minHeight: 100,
                  textAlignVertical: "top",
                  paddingVertical: 12,
                },
              ]}
              placeholder="Descrição do Perfil"
              placeholderTextColor="#64748b"
              value={form.perfil}
              onChangeText={(v) => atualizarPerfil(v)}
              multiline={true}
              numberOfLines={4}
            />
          </View>
        </View>

        {mensagem !== "" && (
          <View style={styles.msgContainer}>
            <Text style={styles.msgTexto}>{mensagem}</Text>
          </View>
        )};

        <TouchableOpacity
          style={styles.btn}
          onPress={salvarAlteracoes}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.txtBtn}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 25,
    backgroundColor: "#0a0b10", // Fundo Dark
  },
  backBtn: {
    marginTop: 40,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#00f2ff", // Azul neon
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,        // Bordas mais retas como no seu card
    alignSelf: 'flex-start', // Para ele não ocupar a largura toda
    backgroundColor: 'transparent',
  },
  titulo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 1,
  },
  inputContainer: {
    backgroundColor: "#161b22", // Card Darker
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
  },
  borderAzul: { borderColor: "#00f2ff44" },
  borderVerde: { borderColor: "#39ff1444" },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#FFF", // Texto Branco para contraste
    outlineStyle: "none",
  },
  eyeIcon: {
    padding: 5,
    marginLeft: 10,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  btn: {
    backgroundColor: "#39ff14", // Verde Neon no botão de ação principal
    height: 58,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
    shadowColor: "#39ff14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  txtBtn: {
    color: "#000", // Texto preto no botão verde neon dá leitura perfeita
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  msgErro: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  msgContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#39ff14aa", // Verde neon
    backgroundColor: "#00f2ff11", // Azul neon suave
  },
  msgTexto: {
    color: "#00f2ff", // Azul neon
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.4,
  },

});
