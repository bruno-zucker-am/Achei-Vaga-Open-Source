// BossCall — central de chamadas B2B entre empresas. Permite buscar empresas, adicionar contatos e iniciar chamadas de áudio/vídeo.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import AudioVideo from "./AudioVideo";
import Efetuadas from "./Efetuadas";
import Recebidas from "./Recebidas";
import ContatosEmpresa from "./ContatosEmpresa";

export default function BossCall() {
  const [abaAtiva, setAbaAtiva] = useState("boss");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [busca, setBusca] = useState("");
  const [chamadaAtual, setChamadaAtual] = useState(null);
  const [meusContatosIds, setMeusContatosIds] = useState([]); // Estado para controlar ícones verdes

  /* ============================
      Carregar IDs dos contatos já salvos
  ============================ */
  useEffect(() => {
    carregarMeusContatos();
  }, []);

  async function carregarMeusContatos() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("chamadas_empresa")
      .select("empresa_destino")
      .eq("empresa_dona_contato", user.id)
      .eq("contato_salvo", true);

    if (data) {
      setMeusContatosIds(data.map((c) => c.empresa_destino));
    }
  }

  /* ============================
      Buscar empresa por nome ou $ID
  ============================ */
  async function buscarEmpresa() {
    if (!busca) return;
    let query = supabase
      .from("cadastro_empresa")
      .select("user_id, nome, foto_url, visivel_id");

    if (busca.startsWith("$")) {
      query = query.eq("visivel_id", busca);
    } else {
      query = query.ilike("nome", `%${busca}%`);
    }

    const { data, error } = await query;
    if (error) console.log(error);
    else setResultadosBusca(data);
  }

  /* ============================
      Adicionar contato (COM VALIDAÇÃO)
  ============================ */
  async function adicionarContato(empresa) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const meuId = user.id;

    // 1. Verifica se já existe para não repetir (Trabalho sério para ficar rico)
    if (meusContatosIds.includes(empresa.user_id)) {
      Alert.alert("Aviso", "Este contato já está na sua lista.");
      return;
    }

    const { error } = await supabase.from("chamadas_empresa").insert({
      empresa_origem: meuId,
      empresa_destino: empresa.user_id,
      status: "contato",
      contato_salvo: true,
      empresa_dona_contato: meuId,
    });

    if (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível adicionar.");
    } else {
      // 2. Atualiza estado local para o ícone mudar na hora
      setMeusContatosIds([...meusContatosIds, empresa.user_id]);
      Alert.alert("Sucesso", "Contato adicionado");
    }
  }

  async function iniciarChamada(destino, tipo) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const meuId = user.id;

    const { data: ocupado } = await supabase
      .from("chamadas_empresa")
      .select("*")
      .eq("empresa_destino", destino.user_id)
      .eq("status", "conectada");

    if (ocupado && ocupado.length > 0) {
      Alert.alert("Este destinatário está em uma chamada no momento");
      return;
    }

    const { data, error } = await supabase
      .from("chamadas_empresa")
      .insert({
        empresa_origem: meuId,
        empresa_destino: destino.user_id,
        tipo: tipo,
        status: "chamando",
        dia_semana: new Date().toLocaleDateString("pt-BR", { weekday: "long" }),
      })
      .select()
      .single();

    if (!error) {
      setChamadaAtual(data);
      setAbaAtiva("ligacao");
    }
  }

  /* ============================
      Render item busca (ÍCONE VERDE)
  ============================ */
  function renderResultado({ item }) {
    const jaAdicionado = meusContatosIds.includes(item.user_id);

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.foto_url }} style={styles.logo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.sub}>{item.visivel_id}</Text>
        </View>

        {/* BOTÃO ADD CONTATO - MUDA COR SE JÁ ADICIONADO */}
        <TouchableOpacity
          style={[
            styles.botaoAdd,
            jaAdicionado && { backgroundColor: "#00FF88" },
          ]}
          onPress={() => adicionarContato(item)}
          disabled={jaAdicionado}
        >
          <MaterialCommunityIcons
            name={jaAdicionado ? "account-check" : "account-plus"}
            size={20}
            color="#000"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoAcao}
          onPress={() => iniciarChamada(item, "audio")}
        >
          <MaterialCommunityIcons name="phone" size={20} color="#00FF88" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoAcao}
          onPress={() => iniciarChamada(item, "video")}
        >
          <MaterialCommunityIcons name="video" size={20} color="#00FF88" />
        </TouchableOpacity>
      </View>
    );
  }

  if (abaAtiva === "ligacao")
    return (
      <AudioVideo
        chamada={chamadaAtual}
        encerrar={() => {
          setChamadaAtual(null);
          setAbaAtiva("boss");
        }}
      />
    );

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>BossCall</Text>
      <View style={styles.tabs}>
        {[
          { key: "boss", label: "BossCall" },
          { key: "efetuadas", label: "Efetuadas" },
          { key: "recebidas", label: "Recebidas" },
          { key: "contatos", label: "Contatos" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setAbaAtiva(tab.key)}
            style={[styles.tabBotao, abaAtiva === tab.key && styles.tabAtiva]}
          >
            <Text
              style={[
                styles.tabTexto,
                abaAtiva === tab.key && { color: "#000" },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {abaAtiva === "boss" && (
        <>
          <View style={styles.buscaContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color="#888"
              style={{ marginLeft: 10 }}
            />
            <TextInput
              placeholder="Buscar empresa ou $ID"
              placeholderTextColor="#888"
              style={styles.input}
              value={busca}
              onChangeText={setBusca}
              onSubmitEditing={buscarEmpresa}
            />
          </View>
          <FlatList
            data={resultadosBusca}
            keyExtractor={(item) => item.user_id}
            renderItem={renderResultado}
          />
        </>
      )}

      {abaAtiva === "efetuadas" && <Efetuadas />}
      {abaAtiva === "recebidas" && <Recebidas />}
      {abaAtiva === "contatos" && <ContatosEmpresa />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F14", paddingTop: 50 },
  titulo: {
    color: "#00FF88",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  tabBotao: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  tabAtiva: { backgroundColor: "#00FF88" },
  tabTexto: { color: "#00FF88", fontWeight: "bold" },
  buscaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1D24",
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  input: { flex: 1, padding: 12, color: "#fff" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161A20",
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 12,
    borderRadius: 15,
  },
  logo: { width: 45, height: 45, borderRadius: 10, marginRight: 10 },
  nome: { color: "#fff", fontSize: 15 },
  sub: { color: "#888", fontSize: 12 },
  botaoAdd: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 50,
    marginRight: 6,
  }, // Começa branco ou cinza
  botaoAcao: {
    backgroundColor: "#1E232B",
    padding: 8,
    borderRadius: 50,
    marginLeft: 6,
  },
});
