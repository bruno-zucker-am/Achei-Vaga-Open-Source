import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navegacao = useNavigation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Realiza o login via Supabase Auth e redireciona conforme o tipo de usuário
  const realizarLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Preencha email e senha.");
      return;
    }
    setCarregando(true);
    try {
      // Autenticação com email e senha
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (authError) {
        Alert.alert("Erro", authError.message || "Login falhou. Verifique email e senha.");
        setCarregando(false);
        return;
      }

      const idUsuario = authData.user.id;

      // Busca simultânea nas tabelas de candidato e empresa para identificar o tipo
      const [resCandidato, resEmpresa] = await Promise.all([
        supabase.from("cadastro_candidato").select("user_id").eq("user_id", idUsuario).maybeSingle(),
        supabase.from("cadastro_empresa").select("user_id").eq("user_id", idUsuario).maybeSingle(),
      ]);

      let tipo = null;
      if (resCandidato.data) tipo = "candidato";
      else if (resEmpresa.data) tipo = "empresa";

      // Se não encontrar perfil, faz logout e avisa
      if (!tipo) {
        Alert.alert("Erro", "Perfil não encontrado. Verifique se o cadastro foi concluído.");
        await supabase.auth.signOut();
        setCarregando(false);
        return;
      }

      // Redireciona para a home correspondente ao tipo de usuário
      if (tipo === "candidato") {
        navegacao.replace("HomeCandidato");
      } else {
        navegacao.replace("HomeEmpresa");
      }
    } catch (erro) {
      console.error("Erro no login:", erro);
      Alert.alert("Erro", "Erro de conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.container}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.logo}>
          Achei<Text style={{ color: "#7cc04d" }}>Vaga</Text>
        </Text>
        <Text style={estilos.subTitulo}>Bem-vindo(a) de volta!</Text>
      </View>

      {/* Campo de e-mail */}
      <View style={estilos.containerInput}>
        <TextInput
          style={estilos.input}
          placeholder="E-mail"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>

      {/* Campo de senha com botão para mostrar/ocultar */}
      <View style={estilos.containerInput}>
        <TextInput
          style={estilos.input}
          placeholder="Senha"
          placeholderTextColor="#999"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
        />
        <TouchableOpacity
          style={estilos.containerIcone}
          onPress={() => setMostrarSenha(!mostrarSenha)}
        >
          <Ionicons
            name={mostrarSenha ? "eye" : "eye-outline"}
            size={24}
            color="#3d85c6"
          />
        </TouchableOpacity>
      </View>

      {/* Botão principal de login */}
      <TouchableOpacity style={estilos.botao} onPress={realizarLogin} disabled={carregando}>
        <Text style={estilos.textoBotao}>
          {carregando ? "Carregando..." : "Entrar"}
        </Text>
      </TouchableOpacity>

      {/* Link para recuperação de senha */}
      <TouchableOpacity
        style={estilos.esqueceuSenha}
        onPress={() => navegacao.navigate("RecuperarSenha")}
      >
        <Text style={estilos.textoEsqueceu}>Esqueci a senha?</Text>
      </TouchableOpacity>

      <View style={estilos.rodape}>
        <Text style={estilos.textoRodape}>
          Powered by{" "}
          <Text style={{ fontWeight: "bold", color: "#3d85c6" }}>CLOUD</Text>{" "}
          <Text style={{ color: "#7cc04d" }}>BRASIL</Text>
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 30, justifyContent: "center" },
  cabecalho: { alignItems: "center", marginBottom: 40 },
  logo: { fontSize: 40, fontWeight: "bold", color: "#1e5b9a", marginBottom: 10 },
  subTitulo: { fontSize: 20, fontWeight: "600", color: "#333" },
  containerInput: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#3d85c6",
    borderRadius: 25, marginBottom: 20,
    paddingHorizontal: 20, height: 55,
  },
  input: { flex: 1, fontSize: 16, color: "#333", ...{ outlineStyle: "none" } },
  containerIcone: { padding: 5 },
  botao: {
    backgroundColor: "#3d85c6", height: 55, borderRadius: 25,
    justifyContent: "center", alignItems: "center", marginTop: 10,
  },
  textoBotao: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  esqueceuSenha: { marginTop: 20, alignItems: "center" },
  textoEsqueceu: { color: "#7cc04d", fontSize: 16, fontWeight: "500" },
  rodape: { position: "absolute", bottom: 40, alignSelf: "center" },
  textoRodape: { fontSize: 14, color: "#999" },
});
