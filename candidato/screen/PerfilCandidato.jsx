// Perfil do candidato — exibe foto, nome e menu de ações (editar perfil, documentos, área de atuação, candidaturas).
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import InformacoesCandidatos from "./cards/InformacoesCandidatos";

export default function PerfilCandidato() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", foto_url: "" });

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
          const { data, error: dbError } = await supabase
            .from("cadastro_candidato")
            .select("nome, foto_url")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (dbError) throw dbError;
          if (data) {
            setForm({
              nome: data.nome || "Candidato sem nome",
              foto_url: data.foto_url || "",
            });
          }
        }
      } catch (e) {
        console.error("🕵️ Erro ao carregar perfil:", e.message);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const selecionarImagem = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      setLoading(true);
      const file = result.assets[0];
      const fileExt = file.uri.split(".").pop().toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;

      // 1. Removi o 'avatars/' para evitar erro de criação de pasta virtual por enquanto
      const filePath = fileName;

      // 2. Upload para o bucket 'fotos_candidato'
      const { error: uploadError } = await supabase.storage
        .from("fotos_candidato")
        .upload(filePath, decode(file.base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Pegar URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("fotos_candidato").getPublicUrl(filePath);

      // 4. ATENÇÃO AQUI: Mudamos para fotos_url (PLURAL)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error: updateError } = await supabase
        .from("cadastro_candidato")
        .update({ foto_url: publicUrl }) // <-- MUDADO PARA PLURAL
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;

      // 5. Atualiza o estado (Também no plural)
      setForm((prev) => ({ ...prev, foto_url: publicUrl }));
      Alert.alert("Sucesso!", "A foto do candidato foi atualizada. 🚀");
    } catch (error) {
      console.error("Erro no upload:", error.message);
      Alert.alert("Erro", "Não conseguimos subir a foto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Avatar e Nome Dinâmico */}
      <View style={[styles.sectionAvatar, { marginTop: 30 }]}>
        <TouchableOpacity
          style={styles.circuloAvatar}
          onPress={selecionarImagem}
          disabled={loading}
        >
          {form.foto_url ? (
            <Image
              source={{ uri: form.foto_url }}
              style={{ width: 90, height: 90, borderRadius: 45 }}
            />
          ) : (
            <MaterialCommunityIcons
              name="account-outline" // Ícone de perfil quando não tem foto
              size={50}
              color="#00f2ff"
            />
          )}
        </TouchableOpacity>

        {/* Ícone de Câmera em vez de texto */}
        <TouchableOpacity
          onPress={selecionarImagem}
          disabled={loading}
          style={{ marginTop: 10, marginBottom: 5 }}
        >
          <MaterialCommunityIcons
            name="camera-outline"
            size={26}
            color="#00f2ff" // Azul neon na câmera
          />
        </TouchableOpacity>

        {/* Nome em Verde Neon */}
        {loading ? (
          <ActivityIndicator color="#00f2ff" style={{ marginTop: 15 }} />
        ) : (
          <Text style={[styles.nomeCandidato, { color: "#39ff14", fontSize: 17, fontWeight: "800", marginTop: 5 }]}>
            {(form.nome || "Carregando...").toUpperCase()}
          </Text>
        )}
      </View>

      {/* Menu de Ações em Grid Style */}
      <View style={styles.menuAcoes}>

        {/* Botão Editar Perfil */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderAzul]}
          onPress={() => navigation.navigate("EditarPerfilCandidato")}
        >
          <MaterialCommunityIcons
            name="pencil-box-outline"
            size={30}
            color="#00f2ff"
          />
          <Text style={styles.textoMenu}>Editar Perfil</Text>
        </TouchableOpacity>

        {/* Botão Adicionar Vagas */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderVerde]}
          onPress={() => navigation.navigate("DocumentosCandidato")}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Documentos Solicitados</Text>
        </TouchableOpacity>


        {/* Botão Aréa de Atuação */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderVerde]}
          onPress={() => navigation.navigate("AreaAtuacao")}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Aréa de Atuação</Text>
        </TouchableOpacity>

        {/* Botão Aréa de Candidatura Candidato */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderVerde]}
          onPress={() => navigation.navigate("CandidaturaCandidato")}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Minhas Candidaturas</Text>
        </TouchableOpacity>
      </View>

      {/* Componente de Detalhes Adicionais */}
      <View style={styles.espacoExtra}>
        <InformacoesCandidatos />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10" },
  headerAzul: {
    backgroundColor: "#111",
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: "#00f2ff33",
  },
  sectionAvatar: {
    alignItems: "center",
    marginTop: -45,
    marginBottom: 20,
  },
  circuloAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00f2ff",
    shadowColor: "#00f2ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  nomeEmpresa: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 12,
    color: "#FFF",
  },
  subtituloVerde: {
    fontSize: 13,
    color: "#39ff14", // Verde Neon
    fontWeight: "600",
    marginTop: 8,
    textTransform: 'uppercase',
  },
  menuAcoes: {
    paddingHorizontal: 20,
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  itemMenu: {
    width: '48%',
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#161b22",
    paddingVertical: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  borderAzul: { borderColor: "#00f2ff44" },
  borderVerde: { borderColor: "#39ff1444" },
  textoMenu: {
    marginTop: 10,
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
    textAlign: 'center'
  },
  espacoExtra: {
    marginTop: 10,
    paddingBottom: 30,
  },
});