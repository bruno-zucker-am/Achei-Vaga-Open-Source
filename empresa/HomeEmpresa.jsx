// Home da empresa — hub principal com barra de navegação inferior (Feed, Candidatos, Entrevistas, Perfil) e menu superior (Parcerias, BossTalk, BossCall, Ranking).
import React, { createContext, useContext, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

// Seus imports de telas
import FeedEmpresa from "./screen/FeedEmpresa";
import VagasEmpresa from "./screen/VagasEmpresa";
import EntrevistasEmpresa from "./screen/EntrevistasEmpresa";
import PerfilEmpresa from "./screen/PerfilEmpresa";
import ParceriasEmpresas from "./parcerias_empresas/ParceriasEmpresas";
import ChatExterno from "./chat_empresa/ChatExterno";
import BossCall from "./chamadas_empresa/BossCall";
import RankingEmpresas from "./ranking_empresas/RankingEmpresas";
import NotificacoesPush from "../components/notificacoes/NotificacoesPush";

const SubAbaContext = createContext();
const Tab = createBottomTabNavigator();

// --- COMPONENTE DE CONTEÚDO PRINCIPAL ---
const HomeContent = () => {
  const [subAbaAtiva, setSubAbaAtiva] = useState(null);
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const resetSubAba = {
    tabPress: () => setSubAbaAtiva(null),
  };

  // Renderizador das Sub-Abas (Overlay)
  const RenderSubAba = () => {
    switch (subAbaAtiva) {
      case "Parcerias":
        return <ParceriasEmpresas />;
      case "BossTalk":
        return <ChatExterno />;
      case "BossCall":
        return <BossCall />;
      case "Ranking":
        return <RankingEmpresas />;
      default:
        return null;
    }
  };

  return (
    <SubAbaContext.Provider value={subAbaAtiva}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />

        {/* Lógica de Notificações */}
        <NotificacoesPush />

        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
          <Text style={styles.headerTitle}>ACHEI VAGA</Text>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => nav.navigate("NotificacoesGlobal")}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color="#7dd3fc"
            />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* TOP MENU (Boss Bar) */}
        <View style={styles.topBossWrapper}>
          {[
            { id: "Parcerias", icon: "handshake" },
            { id: "BossTalk", icon: "comment-text-multiple" },
            { id: "BossCall", icon: "phone-voip" },
            { id: "Ranking", icon: "trophy-variant" },
          ].map((item) => {
            const active = subAbaAtiva === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.topTabItem}
                onPress={() => setSubAbaAtiva(active ? null : item.id)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={active ? "#38bdf8" : "#64748b"}
                />
                <Text
                  style={[
                    styles.topLabel,
                    { color: active ? "#38bdf8" : "#64748b" },
                  ]}
                >
                  {item.id}
                </Text>
                {active && <View style={styles.activeUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB NAVIGATOR */}
        <View style={{ flex: 1 }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: "#22c55e",
              tabBarInactiveTintColor: "#64748b",
              tabBarStyle: styles.bottomTabBar,
              tabBarLabelStyle: styles.bottomLabel,
              tabBarIcon: ({ color, focused }) => {
                let iconName;
                if (route.name === "Feed") iconName = "rss";
                else if (route.name === "Candidatos")
                  iconName = "account-group";
                else if (route.name === "Entrevistas")
                  iconName = "calendar-check";
                else if (route.name === "Perfil") iconName = "office-building";
                return (
                  <MaterialCommunityIcons
                    name={iconName}
                    size={focused ? 28 : 24}
                    color={color}
                  />
                );
              },
            })}
          >
            <Tab.Screen
              name="Feed"
              component={FeedEmpresa}
              listeners={resetSubAba}
            />
            <Tab.Screen
              name="Candidatos"
              component={VagasEmpresa}
              listeners={resetSubAba}
            />
            <Tab.Screen
              name="Entrevistas"
              component={EntrevistasEmpresa}
              listeners={resetSubAba}
            />
            <Tab.Screen
              name="Perfil"
              component={PerfilEmpresa}
              listeners={resetSubAba}
            />
          </Tab.Navigator>
        </View>

        {/* OVERLAY DAS SUB-ABAS */}
        {subAbaAtiva && (
          <View style={styles.subAbaOverlay}>
            <RenderSubAba />
          </View>
        )}
      </View>
    </SubAbaContext.Provider>
  );
};

// --- EXPORTAÇÃO PRINCIPAL ---
export default function HomeEmpresa() {
  return (
    <SafeAreaProvider>
      <HomeContent />
    </SafeAreaProvider>
  );
}

/* ================= ESTILOS ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#38bdf8",
    letterSpacing: 1.5,
  },

  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },

  bellDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
  },

  /* CARD DESTAQUE */

  highlightCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  highlightTitle: {
    color: "#7dd3fc",
    fontWeight: "700",
  },

  /* TOP MENU */

  topBossWrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },

  topTabItem: {
    alignItems: "center",
    paddingVertical: 10,
    flex: 1,
  },

  topLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },

  activeUnderline: {
    height: 3,
    width: "60%",
    backgroundColor: "#38bdf8",
    borderRadius: 3,
    marginTop: 6,
  },

  /* BOTTOM TAB */

  bottomTabBar: {
    backgroundColor: "#020617",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    height: 90,
    paddingBottom: 10,
  },

  bottomLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  /* OVERLAY */

  subAbaOverlay: {
    position: "absolute",
    top: 140,
    left: 0,
    right: 0,
    bottom: 90,
    backgroundColor: "#020617",
    zIndex: 50,
  },
});
