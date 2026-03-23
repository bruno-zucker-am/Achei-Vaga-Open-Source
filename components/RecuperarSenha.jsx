import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from '../lib/supabase';

export default function RecuperarSenha() {
  const navegacao = useNavigation();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Envia um e-mail de redefinição de senha via Supabase Auth
  const recuperarSenha = async () => {
    if (!email) {
      Alert.alert("Erro", "Informe o e-mail.");
      return;
    }
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://seu-app.com/redefinir-senha', // Ajuste para a URL ou deep link do app
      });
      if (error) {
        Alert.alert("Erro", error.message || "Falha ao enviar e-mail de recuperação.");
      } else {
        Alert.alert(
          "Sucesso",
          "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha."
        );
      }
    } catch (erro) {
      console.error("Erro na recuperação:", erro);
      Alert.alert("Erro", "Erro de conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.container}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.logo}>
          Achei<Text style={{ color: '#7cc04d' }}>Vaga</Text>
        </Text>
        <View style={estilos.wrapperTitulo}>
          <Text style={estilos.titulo}>Esqueceu sua senha?</Text>
          <View style={estilos.containerSublinhado}>
            <View style={estilos.linhaAzul} />
            <View style={estilos.linhaVerde} />
          </View>
        </View>
        <Text style={estilos.instrucao}>
          Informe seu e-mail para recuperar o acesso à sua conta.
        </Text>
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

      {/* Botão de envio */}
      <TouchableOpacity style={estilos.botao} onPress={recuperarSenha} disabled={carregando}>
        <Text style={estilos.textoBotao}>{carregando ? "Enviando..." : "Redefinir Senha"}</Text>
      </TouchableOpacity>

      {/* Link de volta ao login */}
      <TouchableOpacity
        style={estilos.botaoVoltar}
        onPress={() => navegacao.navigate("Login")}
      >
        <Text style={estilos.textoVoltar}>Voltar ao Login</Text>
      </TouchableOpacity>

      <View style={estilos.rodape}>
        <Text style={estilos.textoRodape}>
          Powered by <Text style={{ fontWeight: 'bold', color: '#3d85c6' }}>CLOUD</Text>{' '}
          <Text style={{ color: '#7cc04d' }}>BRASIL</Text>
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 30, justifyContent: "center" },
  cabecalho: { alignItems: "center", marginBottom: 30 },
  logo: { fontSize: 40, fontWeight: "bold", color: "#1e5b9a", marginBottom: 30 },
  wrapperTitulo: { alignItems: "center", marginBottom: 20 },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#000" },
  containerSublinhado: { flexDirection: "row", height: 3, width: 150, marginTop: 5 },
  linhaAzul: { flex: 1, backgroundColor: "#3d85c6" },
  linhaVerde: { flex: 1, backgroundColor: "#7cc04d" },
  instrucao: { fontSize: 16, color: "#666", textAlign: "center", paddingHorizontal: 10, lineHeight: 22 },
  containerInput: {
    borderWidth: 1.5, borderColor: "#3d85c6", borderRadius: 25,
    marginBottom: 25, paddingHorizontal: 20, height: 55, justifyContent: "center",
  },
  input: { fontSize: 16, color: "#333", ...({ outlineStyle: 'none' }) },
  botao: { backgroundColor: "#3d85c6", height: 55, borderRadius: 25, justifyContent: "center", alignItems: "center", elevation: 2 },
  textoBotao: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  botaoVoltar: { marginTop: 25, alignItems: "center" },
  textoVoltar: { color: "#7cc04d", fontSize: 16, fontWeight: "500" },
  rodape: { position: "absolute", bottom: 40, alignSelf: "center" },
  textoRodape: { fontSize: 12, color: "#999" },
});
