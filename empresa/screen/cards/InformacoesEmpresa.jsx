// Informações da empresa — exibe razão social, CNPJ e endereço em modo somente leitura.
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TextInput, ScrollView } from "react-native";

import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "AuthApiError: Invalid Refresh Token: Refresh Token Not Found",
]);

export default function InformacoesEmpresa() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    nome: "",
    email: "",
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

  return (
    <ScrollView 
      // O segredo está nesse paddingBottom de 150. Ele empurra tudo pra cima da barra.
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }} 
      style={{ backgroundColor: "#0a0b10" }}
    >
      <View style={styles.container}>
        <Text style={styles.titulo}>Informações da Empresa</Text>

        {/* Nome */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>Razão Social</Text>
          <Text style={styles.input}>{form.nome}</Text>
        </View>

        {/* CNPJ */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>CNPJ</Text>
          <Text style={styles.input}>{form.cnpj}</Text>
        </View>

        <View style={styles.row}>
           {/* CEP */}
          <View style={[styles.inputContainer, styles.borderVerde, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>CEP</Text>
            <Text style={styles.input}>{form.endereco.cep}</Text>
          </View>

          {/* Estado */}
          <View style={[styles.inputContainer, styles.borderVerde, { width: 80 }]}>
            <Text style={styles.label}>UF</Text>
            <Text style={styles.input}>{form.endereco.estado}</Text>
          </View>
        </View>

        {/* Cidade */}
        <View style={[styles.inputContainer, styles.borderVerde]}>
          <Text style={styles.label}>Cidade</Text>
          <Text style={styles.input}>{form.endereco.cidade}</Text>
        </View>

        {/* ESPAÇO EXTRA PARA GARANTIR QUE O ÚLTIMO ITEM NÃO FIQUE COLADO */}
        <View style={{ height: 20 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Tirei o flex: 1 daqui, ele atrapalha a rolagem dentro do ScrollView
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#0a0b10",
  },

  titulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "left", 
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#39ff14", // Verde Neon
    paddingLeft: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#161b22", // Card Dark
  },
  borderAzul: { borderColor: "#00f2ff44" },
  borderVerde: { borderColor: "#39ff1444" },
  label: {
    fontSize: 10,
    color: "#00f2ff", // Label em Azul Neon
    fontWeight: "bold",
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    color: "#E2E8F0", // Branco acinzentado para leitura
    fontWeight: "600",
  },
});