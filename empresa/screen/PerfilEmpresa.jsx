// Perfil da empresa — exibe foto, nome e menu de ações (editar perfil, adicionar vaga, solicitar documentos, vagas publicadas, processo seletivo).
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
import { supabase } from "../../lib/supabase"; // Verifique se o caminho do seu supabase está correto
import InformacoesEmpresa from "./cards/InformacoesEmpresa";

export default function PerfilEmpresa() {
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
            .from("cadastro_empresa")
            .select("nome, foto_url")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (dbError) throw dbError;
          if (data) {
            setForm({
              nome: data.nome || "Empresa sem nome",
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

      // 2. Upload para o bucket 'fotos_empresa'
      const { error: uploadError } = await supabase.storage
        .from("fotos_empresa")
        .upload(filePath, decode(file.base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Pegar URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("fotos_empresa").getPublicUrl(filePath);

      // 4. ATENÇÃO AQUI: Mudamos para fotos_url (PLURAL)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error: updateError } = await supabase
        .from("cadastro_empresa")
        .update({ foto_url: publicUrl }) // <-- MUDADO PARA PLURAL
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;

      // 5. Atualiza o estado (Também no plural)
      setForm((prev) => ({ ...prev, foto_url: publicUrl }));
      Alert.alert("Sucesso!", "A foto da empresa foi atualizada. 🚀");
    } catch (error) {
      console.error("Erro no upload:", error.message);
      Alert.alert("Erro", "Não conseguimos subir a foto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

 return (
    <ScrollView style={styles.container}>
      {/* Header Limpo Neon */}
      <View style={styles.headerAzul} />

      {/* Avatar e Nome Dinâmico */}
      <View style={styles.sectionAvatar}>
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
              name="camera-plus-outline"
              size={40}
              color="#00f2ff"
            />
          )}
        </TouchableOpacity>

        {/* Texto Alterar Foto */}
        <TouchableOpacity onPress={selecionarImagem} disabled={loading}>
          <Text style={styles.subtituloVerde}>Alterar foto</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#00f2ff" style={{ marginTop: 15 }} />
        ) : (
          <Text style={styles.nomeEmpresa}>{form.nome || "Carregando..."}</Text>
        )}
      </View>

      {/* Menu de Ações em Grid Style */}
      <View style={styles.menuAcoes}>
        
        {/* Botão Editar Perfil */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderAzul]}
          onPress={() => navigation.navigate("EditarPerfilEmpresa")}
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
          onPress={() => navigation.navigate("AdicionarVaga")}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Adicionar Vagas</Text>
        </TouchableOpacity>

        {/* Botão Solicitar Documentos (Largo) */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderVerde, { width: '100%' }]}
          onPress={() => navigation.navigate("SolicitarDocumentos")}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Solicitar Documentos</Text>
        </TouchableOpacity>

        {/* Botão Vagas Publicadas */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderVerde, { width: '100%' }]}
          onPress={() => navigation.navigate("VagasPublicadas")}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Vagas Publicadas</Text>
        </TouchableOpacity>

         {/* Botão Processo Seletivo */}
        <TouchableOpacity
          style={[styles.itemMenu, styles.borderVerde, { width: '100%' }]}
          onPress={() => navigation.navigate("ProcessoSeletivo")}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={30}
            color="#39ff14"
          />
          <Text style={styles.textoMenu}>Processo Seletivo</Text>
        </TouchableOpacity>
      </View>

      {/* Componente de Detalhes Adicionais */}
      <View style={styles.espacoExtra}>
        <InformacoesEmpresa />
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