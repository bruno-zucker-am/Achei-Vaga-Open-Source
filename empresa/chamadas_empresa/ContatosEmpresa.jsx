// Lista de contatos salvos da empresa — exibe empresas adicionadas com opção de remover.
import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Gerencia a lista de contatos salvos da empresa
export default function ContatosEmpresa() {
  const [contatos, setContatos] = useState([]);

  useEffect(() => {
    buscarContatos();
  }, []);

  /* ============================
      Busca contatos salvos no banco
  ============================ */
  async function buscarContatos() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("chamadas_empresa")
      .select(`
        id,
        cadastro_empresa!chamadas_empresa_empresa_destino_fkey (
          nome,
          foto_url,
          visivel_id
        )
      `)
      .eq("empresa_dona_contato", user.id)
      .eq("contato_salvo", true);

    if (error) {
      console.log("Erro ao buscar:", error.message);
    } else {
      setContatos(data || []);
    }
  }

  /* ============================
      Remoção REAL e Direta
  ============================ */
  async function apagarContato(idLinha) {
    // 1. Tenta deletar no banco primeiro
    const { error } = await supabase
      .from("chamadas_empresa")
      .delete()
      .match({ id: idLinha }); // match garante o alvo exato do UUID

    if (error) {
      console.log("Erro Supabase:", error.message);
      Alert.alert("Erro no Banco", "A linha não foi apagada. Verifique as Policies (RLS) no Supabase.");
    } else {
      // 2. Só tira da tela se o banco confirmou a deleção
      setContatos((prev) => prev.filter((item) => item.id !== idLinha));
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contatos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.infoEmpresa}>
              <Image 
                source={{ uri: item.cadastro_empresa?.foto_url }} 
                style={styles.foto} 
              />
              <View>
                <Text style={styles.nome}>{item.cadastro_empresa?.nome}</Text>
                <Text style={styles.idTexto}>{item.cadastro_empresa?.visivel_id}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.botaoLixo} 
              onPress={() => apagarContato(item.id)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={26} color="#FF5555" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F14", padding: 15 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: "#161A20", 
    padding: 12, 
    borderRadius: 15, 
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  infoEmpresa: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  foto: { width: 45, height: 45, borderRadius: 10, marginRight: 12 },
  nome: { color: "#fff", fontWeight: 'bold', fontSize: 16 },
  idTexto: { color: '#888', fontSize: 12 },
  botaoLixo: { padding: 8 }
});