// Documentos recebidos — permite visualizar e baixar arquivos enviados pelo candidato, e finalizar o processo.
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

export default function SolicitacoesRecebidas() {
  const [documentosRecebidos, setDocumentosRecebidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    fetchDocumentosRecebidos();
  }, []);

  const fetchDocumentosRecebidos = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("documentos_admissao")
        .select(
          "id, nome_documento, status, arquivo_frente_url, arquivo_verso_url, requer_verso",
        )
        .eq("empresa_id", session.user.id)
        .eq("status", "recebido");

      if (error) throw error;
      setDocumentosRecebidos(data || []);
    } catch (e) {
      console.error("Erro ao buscar:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const getMimeType = (ext) => {
    switch (ext) {
      case "pdf":
        return "application/pdf";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      default:
        return "image/png";
    }
  };

  const baixarEVisualizar = async (path, nomeDoc) => {
    if (!path) return Alert.alert("Erro", "Caminho do arquivo vazio.");

    try {
      setLoading(true);

      // 1. Permissão de Galeria
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert(
          "Erro",
          "Preciso de permissão para salvar o arquivo.",
        );
      }

      // 2. Pegar a URL (Se o bucket for privado, use createSignedUrl aqui)
      const { data } = supabase.storage
        .from("documentos_url")
        .getPublicUrl(path);
      console.log("DEBUG: Baixando de:", data.publicUrl);

      // 3. Preparar caminho local
      const extensao = path.split(".").pop().toLowerCase() || "jpg";
      const fileUri = `${FileSystem.cacheDirectory}${Date.now()}.${extensao}`;

      // 4. Download real
      const download = await FileSystem.downloadAsync(data.publicUrl, fileUri);

      // Verificação de tamanho: se for muito pequeno, baixou erro em vez de imagem
      if (download.headers["Content-Length"] < 500) {
        console.warn(
          "Aviso: O arquivo parece estar vazio ou deu erro de acesso.",
        );
      }

      // 5. Salvar na Galeria
      const asset = await MediaLibrary.createAssetAsync(download.uri);
      await MediaLibrary.createAlbumAsync("AcheiVaga_Docs", asset, false);

      Alert.alert("Sucesso", `Documento "${nomeDoc}" salvo na galeria.`);
    } catch (e) {
      console.error("ERRO DOWNLOAD:", e);
      Alert.alert("Erro", "Falha ao baixar. Verifique a conexão e o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarTodos = async () => {
    if (documentosRecebidos.length === 0) return;

    Alert.alert(
      "Finalizar Tudo",
      `Deseja confirmar o recebimento de ${documentosRecebidos.length} documento(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setFinalizing(true);
            try {
              const ids = documentosRecebidos.map((d) => d.id);

              const { error } = await supabase
                .from("documentos_admissao")
                .update({ status: "encerrado", encerrar: true })
                .in("id", ids);

              if (error) throw error;

              setDocumentosRecebidos([]);
              Alert.alert(
                "Sucesso",
                "Todos os documentos foram movidos para o histórico.",
              );
            } catch (e) {
              Alert.alert("Erro", e.message);
            } finally {
              setFinalizing(false);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.docName}>{item.nome_documento}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.btnView}
          onPress={() =>
            baixarEVisualizar(
              item.arquivo_frente_url,
              `Frente_${item.nome_documento}`,
            )
          }
        >
          <MaterialCommunityIcons name="file-eye" size={20} color="#00f2ff" />
          <Text style={styles.btnViewText}>
            {item.requer_verso ? "FRENTE" : "ABRIR DOCUMENTO"}
          </Text>
        </TouchableOpacity>

        {item.requer_verso && (
          <TouchableOpacity
            style={styles.btnView}
            onPress={() =>
              baixarEVisualizar(
                item.arquivo_verso_url,
                `Verso_${item.nome_documento}`,
              )
            }
          >
            <MaterialCommunityIcons name="file-eye" size={20} color="#00f2ff" />
            <Text style={styles.btnViewText}>VERSO</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && (
        <ActivityIndicator
          color="#39ff14"
          size="small"
          style={{ marginBottom: 10 }}
        />
      )}

      <FlatList
        data={documentosRecebidos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhum documento pendente para conferência.
          </Text>
        }
      />

      {documentosRecebidos.length > 0 && (
        <TouchableOpacity
          style={styles.btnFinalizar}
          onPress={finalizarTodos}
          disabled={finalizing}
        >
          {finalizing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-all" size={24} color="#FFF" />
              <Text style={styles.btnFinalizarTxt}>FINALIZAR TUDO</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10", padding: 20 },
  card: {
    backgroundColor: "#161b22",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#39ff14",
    elevation: 3,
  },
  docName: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 15,
  },
  row: { flexDirection: "row", gap: 10 },
  btnView: {
    flex: 1,
    backgroundColor: "#00f2ff10",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#00f2ff33",
  },
  btnViewText: {
    color: "#00f2ff",
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 8,
  },
  btnFinalizar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#007AFF",
    height: 65,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  btnFinalizarTxt: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 10,
  },
  empty: { color: "#475569", textAlign: "center", marginTop: 50, fontSize: 14 },
});
