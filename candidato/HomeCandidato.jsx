import React, { createContext, useContext, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import FeedCandidato from "./screen/FeedCandidato";
import VagasCandidato from "./screen/VagasCandidato";
import EntrevistasCandidatos from "./screen/EntrevistasCandidatos";
import PerfilCandidato from "./screen/PerfilCandidato";
import CandidatoSegue from "./screen/CandidatoSegue";
import ChatBot from "./screen/ChatBot";
import VisualizacoesCandidatos from "./screen/VisualizacoesCandidatos";
import SuporteCandidatos from "./screen/SuporteCandidatos";
import NotificacoesPush from "../components/notificacoes/NotificacoesPush";

// Contexto para compartilhar a sub-aba ativa entre componentes filhos
const ContextoSubAba = createContext();
const AbaBaixo = createBottomTabNavigator();

function ConteudoHomeCandidato() {
  const [subAbaAtiva, setSubAbaAtiva] = useState(null);
  const insets = useSafeAreaInsets();

  // Fecha a sub-aba ao trocar de aba principal
  const fecharSubAba = { tabPress: () => setSubAbaAtiva(null) };

  // Barra superior com ações extras: Seguindo, ChatBot, Visualizações e Suporte
  const BarraSuperior = () => (
    <View style={[estilos.containerBarraSuperior, { paddingTop: insets.top }]}>
      {[
        { id: "Seguindo", icone: "bookmark" },
        { id: "ChatBot", icone: "robot" },
        { id: "Visualizações", icone: "eye" },
        { id: "Suporte", icone: "headset" },
      ].map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => setSubAbaAtiva(subAbaAtiva === item.id ? null : item.id)}
          style={estilos.itemAbaSuperior}
        >
          <View style={subAbaAtiva === item.id ? estilos.brilhoAtivo : null}>
            <MaterialCommunityIcons
              name={item.icone}
              size={subAbaAtiva === item.id ? 26 : 22}
              color={subAbaAtiva === item.id ? "#39ff14" : "#64748b"}
            />
          </View>
          <Text style={[estilos.rotuloSuperior, { color: subAbaAtiva === item.id ? "#39ff14" : "#64748b" }]}>
            {item.id}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Renderiza o conteúdo da sub-aba selecionada como overlay
  const RenderizarSubAba = () => {
    switch (subAbaAtiva) {
      case "Seguindo": return <CandidatoSegue />;
      case "ChatBot": return <ChatBot />;
      case "Visualizações": return <VisualizacoesCandidatos />;
      case "Suporte": return <SuporteCandidatos />;
      default: return null;
    }
  };

  return (
    <ContextoSubAba.Provider value={subAbaAtiva}>
      <View style={{ flex: 1, backgroundColor: "#0a0b10" }}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0b10" />
        <NotificacoesPush />
        <BarraSuperior />

        <View style={{ flex: 1 }}>
          <AbaBaixo.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: "#39ff14",
              tabBarInactiveTintColor: "#64748b",
              tabBarStyle: estilos.barraAbaBaixo,
              tabBarLabelStyle: estilos.rotuloAbaBaixo,
              tabBarIcon: ({ color, focused }) => {
                const icones = { Feed: "rss", Vagas: "briefcase-search", Entrevistas: "calendar-clock", Perfil: "account" };
                return (
                  <View style={focused ? estilos.brilhoAtivoBaixo : null}>
                    <MaterialCommunityIcons name={icones[route.name]} size={focused ? 28 : 24} color={color} />
                  </View>
                );
              },
            })}
          >
            <AbaBaixo.Screen name="Feed" component={FeedCandidato} listeners={fecharSubAba} />
            <AbaBaixo.Screen name="Vagas" component={VagasCandidato} listeners={fecharSubAba} />
            <AbaBaixo.Screen name="Entrevistas" component={EntrevistasCandidatos} listeners={fecharSubAba} />
            <AbaBaixo.Screen name="Perfil" component={PerfilCandidato} listeners={fecharSubAba} />
          </AbaBaixo.Navigator>
        </View>

        {/* Overlay das sub-abas superiores */}
        {subAbaAtiva && (
          <View style={estilos.overlaySubAba}>
            <RenderizarSubAba />
          </View>
        )}
      </View>
    </ContextoSubAba.Provider>
  );
}

export const useSubAba = () => useContext(ContextoSubAba);

export default function HomeCandidato() {
  return (
    <SafeAreaProvider>
      <ConteudoHomeCandidato />
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  containerBarraSuperior: {
    flexDirection: "row", backgroundColor: "#0a0b10",
    height: 90, borderBottomWidth: 1, borderBottomColor: "#1e293b",
    alignItems: "center", justifyContent: "space-around",
  },
  itemAbaSuperior: { alignItems: "center", justifyContent: "center", flex: 1 },
  rotuloSuperior: { fontSize: 10, fontWeight: "700", marginTop: 6 },
  barraAbaBaixo: {
    backgroundColor: "#0a0b10", borderTopWidth: 1, borderTopColor: "#1e293b",
    height: 115, paddingBottom: 30, paddingTop: 10, position: "absolute",
  },
  rotuloAbaBaixo: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  brilhoAtivo: { shadowColor: "#39ff14", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 8, elevation: 10 },
  brilhoAtivoBaixo: { shadowColor: "#39ff14", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12, elevation: 15 },
  overlaySubAba: { position: "absolute", top: 90, left: 0, right: 0, bottom: 115, backgroundColor: "#0a0b10", zIndex: 50 },
});
