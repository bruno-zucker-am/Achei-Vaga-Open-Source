// Documentos solicitados pela empresa — lista documentos pendentes com status e opção de envio.
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";

export default function DocumentosCandidato() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [documentos, setDocumentos] = useState({
    rg: { status: "Pendente", url: null },
    cpf: { status: "Pendente", url: null },
    comprovante_residencia: { status: "Pendente", url: null },
    cnh: { status: "Pendente", url: null },
  });

  useEffect(() => {
    carregarDocumentos();
  }, []);

  const carregarDocumentos = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("cadastro_candidato")
        .select("documentos")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;
      if (data?.documentos) {
        setDocumentos(data.documentos);
      }
    } catch (e) {
      console.error("Erro ao carregar docs:", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para simular o upload (Para integrar com Expo Image Picker depois)
  const handleUpload = (tipo) => {
    Alert.alert("Upload", `Deseja selecionar o arquivo para ${tipo.toUpperCase()}?`);
    // Aqui entrará a lógica de selecionar arquivo e subir para o Supabase Storage
  };

  const ItemDocumento = ({ titulo, tipo, status }) => (
    <View style={[styles.cardDoc, status === "Aprovado" ? styles.borderVerde : styles.borderAzul]}>
      <View>
        <Text style={styles.labelDoc}>{titulo}</Text>
        <Text style={[styles.statusDoc, { color: status === "Aprovado" ? "#39ff14" : "#64748b" }]}>
          Status: {status}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.btnUpload}
        onPress={() => handleUpload(tipo)}
      >
        <Text style={styles.btnUploadText}>{status === "Pendente" ? "ENVIAR" : "REENVIAR"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      style={{ backgroundColor: "#0a0b10" }}
    >
      <View style={styles.container}>
        {/* Botão Voltar */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← VOLTAR</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Meus Documentos</Text>
        <Text style={styles.subtitulo}>Envie os documentos solicitados para finalizar sua contratação.</Text>

        {loading ? (
          <ActivityIndicator color="#00f2ff" size="large" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <ItemDocumento titulo="RG (Frente e Verso)" tipo="rg" status={documentos.rg.status} />
            <ItemDocumento titulo="CPF" tipo="cpf" status={documentos.cpf.status} />
            <ItemDocumento titulo="Comprovante de Residência" tipo="comprovante_residencia" status={documentos.comprovante_residencia.status} />
            <ItemDocumento titulo="CNH (Se possuir)" tipo="cnh" status={documentos.cnh.status} />
          </View>
        )}

        <TouchableOpacity 
          style={styles.btnSalvar}
          onPress={() => Alert.alert("Sucesso", "Documentos enviados para análise!")}
        >
          <Text style={styles.txtBtnSalvar}>FINALIZAR ENTREGA</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 60 },
  container: { padding: 25 },
  backBtn: {
    marginTop: 40,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#00f2ff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  backBtnText: { color: "#00f2ff", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  titulo: { fontSize: 28, fontWeight: "800", color: "#FFF", marginBottom: 10 },
  subtitulo: { color: "#94a3b8", fontSize: 14, marginBottom: 30 },
  cardDoc: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "#161b22",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
  },
  borderAzul: { borderColor: "#00f2ff44" },
  borderVerde: { borderColor: "#39ff1444" },
  labelDoc: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  statusDoc: { fontSize: 12, marginTop: 4 },
  btnUpload: {
    borderWidth: 1,
    borderColor: "#00f2ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  btnUploadText: { color: "#00f2ff", fontSize: 10, fontWeight: "bold" },
  btnSalvar: {
    backgroundColor: "#39ff14",
    height: 58,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    shadowColor: "#39ff14",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  txtBtnSalvar: { color: "#000", fontSize: 16, fontWeight: "bold" },
});