// Edição de perfil da empresa — permite atualizar nome, CNPJ, endereço e senha.
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "AuthApiError: Invalid Refresh Token: Refresh Token Not Found",
]);

export default function EditarPerfilEmpresa() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    cnpj: "",
    endereco: {
      cep: "",
      cidade: "",
      estado: "",
    },
  });

  // 1. CARREGAR DADOS ATUAIS (Importante para não salvar campos vazios)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // 1. Pega a sessão com um pequeno delay para a rede estabilizar
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          console.log("✅ Conectado como:", session.user.id);

          // 2. Busca os dados com o filtro exato
          const { data, error: dbError } = await supabase
            .from("cadastro_empresa")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle(); // maybeSingle evita erro se não achar nada

          if (dbError) throw dbError;

          if (data) {
            setForm({
              nome: data.nome || "",
              email: session.user.email || "",
              senha: "",
              confirmarSenha: "",
              cnpj: data.cnpj || "",
              endereco: {
                cep: data.endereco?.cep || "",
                cidade: data.endereco?.cidade || "",
                estado: data.endereco?.estado || "",
              },
            });
          }
        }
      } catch (e) {
        // Se der o erro de "aborted", vamos apenas logar, ele não quebra o app
        if (e.name !== "AbortError") {
          console.error("🕵️ Erro no processo:", e.message);
        }
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const handleChange = (field, value) => {
    let sanitized = value;
    if (field === "cnpj" || field === "cep")
      sanitized = value.replace(/[^0-9]/g, "");

    if (field === "cep" || field === "cidade" || field === "estado") {
      setForm((prev) => ({
        ...prev,
        endereco: { ...prev.endereco, [field]: sanitized },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: sanitized }));
    }
  };

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
        .from("cadastro_empresa")
        .update({
          nome: form.nome,
          cnpj: form.cnpj,
          endereco: form.endereco,
        })
        .eq("user_id", session.user.id);

      if (dbError) throw dbError;

      // B) ATUALIZAR SENHA (Se o usuário digitou algo na senha)
      if (form.senha !== "") {
        if (form.senha !== form.confirmarSenha) {
          throw new Error("As senhas não conferem.");
        }
        const { error: authError } = await supabase.auth.updateUser({
          password: form.senha,
        });
        if (authError) throw authError;
      }

      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      setErro(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, backgroundColor: "#0a0b10" }}
      style={{ backgroundColor: "#0a0b10" }}
    >
      <View style={styles.container}>
        {/* Botão Voltar Neon */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={{ color: "#00f2ff", fontSize: 16, fontWeight: "600" }}>
            ← Voltar
          </Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Editar Perfil</Text>

        {erro !== "" && <Text style={styles.msgErro}>{erro}</Text>}

        {/* Nome */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <TextInput
            style={styles.input}
            placeholder="Nome da Empresa"
            placeholderTextColor="#64748b"
            value={form.nome}
            onChangeText={(v) => handleChange("nome", v)}
          />
        </View>

        {/* Senha */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <TextInput
            style={styles.input}
            placeholder="Nova Senha"
            placeholderTextColor="#64748b"
            value={form.senha}
            onChangeText={(v) => handleChange("senha", v)}
            secureTextEntry={!mostrarSenha}
          />
          <TouchableOpacity
            onPress={() => setMostrarSenha(!mostrarSenha)}
            style={styles.eyeIcon}
          >
            <Text style={{ fontSize: 12, color: "#00f2ff", fontWeight: 'bold' }}>
              {mostrarSenha ? "OCULTAR" : "MOSTRAR"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confirmar Senha */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <TextInput
            style={styles.input}
            placeholder="Confirme a nova senha"
            placeholderTextColor="#64748b"
            value={form.confirmarSenha}
            onChangeText={(v) => handleChange("confirmarSenha", v)}
            secureTextEntry={!mostrarConfirmarSenha}
            autoComplete="off"
            textContentType="none"
          />
          <TouchableOpacity
            onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
            style={styles.eyeIcon}
          >
            <Text style={{ fontSize: 12, color: "#00f2ff", fontWeight: 'bold' }}>
              {mostrarConfirmarSenha ? "OCULTAR" : "MOSTRAR"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CNPJ */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <TextInput
            style={styles.input}
            placeholder="CNPJ"
            placeholderTextColor="#64748b"
            value={form.cnpj}
            onChangeText={(v) => handleChange("cnpj", v)}
            keyboardType="numeric"
            maxLength={14}
          />
        </View>

        {/* CEP */}
        <View style={[styles.inputContainer, styles.borderVerde]}>
          <TextInput
            style={styles.input}
            placeholder="CEP"
            placeholderTextColor="#64748b"
            value={form.endereco.cep}
            onChangeText={(v) => handleChange("cep", v)}
            keyboardType="numeric"
            maxLength={8}
          />
        </View>

        {/* Cidade e UF */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { width: "68%" },
              errors.cidade && styles.inputError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Cidade"
              placeholderTextColor="#64748b"
              value={form.endereco.cidade}
              onChangeText={(v) => handleChange("cidade", v)}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { width: "28%" },
              errors.estado && styles.inputError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="UF"
              placeholderTextColor="#64748b"
              value={form.endereco.estado}
              onChangeText={(v) => handleChange("estado", v)}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>

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
  },
  titulo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "left",
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
});