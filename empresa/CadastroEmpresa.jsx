// Cadastro de empresa — formulário com nome, e-mail, senha, CNPJ e endereço. Envia email de confirmação.
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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { LogBox } from "react-native";

// eas build --profile preview --platform android --clear-cache
LogBox.ignoreLogs([
  "AuthApiError: Invalid Refresh Token: Refresh Token Not Found",
]);

export default function CadastroEmpresa() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [erro, setErro] = useState("");
  const [errors, setErrors] = useState({}); // Estado de erros de validação
  const formSnapshotRef = useRef(null);

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

  useEffect(() => {
    const processarSalvamento = async (session) => {
      if (session && formSnapshotRef.current) {
        const snapshot = { ...formSnapshotRef.current };
        formSnapshotRef.current = null;

        console.log("🛠️ Salvando dados da empresa no banco...");

        try {
          const { error } = await supabase.from("cadastro_empresa").upsert(
            [
              {
                user_id: session.user.id,
                nome: snapshot.nome,
                email: snapshot.email,
                cnpj: snapshot.cnpj,
                endereco: snapshot.endereco, // Salva como JSONB
              },
            ],
            { onConflict: "user_id" }
          );

          if (error) throw error;
          console.log("🔥 SUCESSO: Empresa cadastrada!");
          setEmailConfirmado(true);
          setTimeout(() => navigation.replace("HomeEmpresa"), 2000);
        } catch (err) {
          if (!err.message?.includes("Refresh Token Not Found")) {
            console.error("Erro no banco:", err.message);
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) processarSalvamento(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        processarSalvamento(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigation]);

  const fetchEnderecoByCep = async (cep) => {
    if (cep.length !== 8) return;
    setLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            cep,
            cidade: data.localidade,
            estado: data.uf,
          },
        }));
        setErrors((prev) => ({ ...prev, cep: null }));
      } else {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado." }));
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao buscar CEP.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    let sanitized = value;
    if (field === "cnpj" || field === "cep")
      sanitized = value.replace(/[^0-9]/g, "");

    if (field === "cep" || field === "cidade" || field === "estado") {
      setForm((prev) => ({
        ...prev,
        endereco: { ...prev.endereco, [field]: sanitized },
      }));
      if (field === "cep" && sanitized.length === 8)
        fetchEnderecoByCep(sanitized);
    } else {
      setForm((prev) => ({ ...prev, [field]: sanitized }));
    }
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validarForm = () => {
    const regexSenha =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,9}$/;
    if (!form.nome.trim()) return "Nome fantasia é obrigatório.";
    if (!form.cnpj || form.cnpj.length !== 14)
      return "CNPJ inválido (14 dígitos).";
    if (!form.email.includes("@")) return "E-mail inválido.";
    if (!regexSenha.test(form.senha))
      return "Senha deve ter 7-9 caracteres, Maiúscula, Minúscula, Número e Especial.";
    if (form.senha !== form.confirmarSenha) return "Senhas não conferem.";
    if (!form.endereco.cep || form.endereco.cep.length !== 8)
      return "CEP incompleto.";
    return null;
  };

  const enviarCadastro = async () => {
    const erroValidacao = validarForm();
    if (erroValidacao) return setErro(erroValidacao);

    setErro("");
    setLoading(true);

    try {
      // 🔒 Congela o formulário
      formSnapshotRef.current = form;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: { tipo: "empresa" },
          emailRedirectTo: "exp://192.168.100.2:8081", // Redireciona pro App após confirmar o e-mail
        },
      });

      if (authError) throw authError;

      setLoading(false);
      setEmailEnviado(true); // Mostra mensagem de confirmação
    } catch (error) {
      setLoading(false);
      console.error("Erro no sign-up:", error);
      setErro(error.message || "Erro no cadastro.");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={{ color: "#3d85c6", fontSize: 18 }}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Cadastro de Empresa</Text>

        {/* Mensagens */}
        {erro !== "" && <Text style={styles.msgErro}>{erro}</Text>}

        {emailEnviado && !emailConfirmado && (
          <Text style={styles.msgAviso}>
            📧 Enviamos um link de confirmação para {form.email}. Abra o email e
            clique no link para ativar sua conta.
          </Text>
        )}

        {/* Nome */}
        <View style={[styles.inputContainer, errors.nome && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="Nome da Empresa"
            value={form.nome}
            onChangeText={(v) => handleChange("nome", v)}
          />
        </View>
        {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}

        {/* Email */}
        <View
          style={[styles.inputContainer, errors.email && styles.inputError]}
        >
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChangeText={(v) => handleChange("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Senha */}
        <View
          style={[styles.inputContainer, errors.senha && styles.inputError]}
        >
          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={form.senha}
            onChangeText={(v) => handleChange("senha", v)}
            secureTextEntry={!mostrarSenha}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setMostrarSenha(!mostrarSenha)}
          >
            <Ionicons
              name={mostrarSenha ? "eye-off" : "eye"}
              size={24}
              color="#3d85c6"
            />
          </TouchableOpacity>
        </View>
        {errors.senha && <Text style={styles.errorText}>{errors.senha}</Text>}

        {/* Confirmar Senha */}
        <View
          style={[
            styles.inputContainer,
            errors.confirmarSenha && styles.inputError,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Confirme a senha"
            value={form.confirmarSenha}
            onChangeText={(v) => handleChange("confirmarSenha", v)}
            secureTextEntry={!mostrarConfirmarSenha}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
          >
            <Ionicons
              name={mostrarConfirmarSenha ? "eye-off" : "eye"}
              size={24}
              color="#3d85c6"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmarSenha && (
          <Text style={styles.errorText}>{errors.confirmarSenha}</Text>
        )}

        {/* CNPJ */}
        <View style={[styles.inputContainer, errors.cnpj && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="CNPJ (somente números)"
            value={form.cnpj}
            onChangeText={(v) => handleChange("cnpj", v)}
            keyboardType="numeric"
            maxLength={14}
          />
        </View>
        {errors.cnpj && <Text style={styles.errorText}>{errors.cnpj}</Text>}

        {/* CEP */}
        <View style={[styles.inputContainer, errors.cep && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="CEP (somente números)"
            value={form.endereco.cep}
            onChangeText={(v) => handleChange("cep", v)}
            keyboardType="numeric"
            maxLength={8}
          />
        </View>
        {errors.cep && <Text style={styles.errorText}>{errors.cep}</Text>}

        {/* Cidade */}
        <View
          style={[styles.inputContainer, errors.cidade && styles.inputError]}
        >
          <TextInput
            style={styles.input}
            placeholder="Cidade"
            value={form.endereco.cidade}
            onChangeText={(v) => handleChange("cidade", v)}
          />
        </View>
        {errors.cidade && <Text style={styles.errorText}>{errors.cidade}</Text>}

        {/* Estado */}
        <View
          style={[styles.inputContainer, errors.estado && styles.inputError]}
        >
          <TextInput
            style={styles.input}
            placeholder="Estado"
            value={form.endereco.estado}
            onChangeText={(v) => handleChange("estado", v)}
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>
        {errors.estado && <Text style={styles.errorText}>{errors.estado}</Text>}

        <TouchableOpacity
          style={styles.btn}
          onPress={enviarCadastro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.txtBtn}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by{" "}
            <Text style={{ color: "#2196F3", fontWeight: "bold" }}>Idea</Text>
          </Text>
          <Text style={[styles.footerText, { color: "#4CAF50", marginTop: 2 }]}>
            PRATICUM ET UTILE, SEMPER ORIGINALE
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a2e44",
    textAlign: "center",
    marginBottom: 40,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: "#3d85c6",
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    height: 55,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    outlineStyle: "none",
  },
  eyeIcon: {
    position: "absolute",
    right: 20,
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 20,
  },
  btn: {
    backgroundColor: "#7cc04d",
    height: 55,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },
  txtBtn: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 50,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
