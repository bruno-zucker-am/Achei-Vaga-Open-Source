import React, { useState, useEffect, useRef } from "react";
import { LogBox } from "react-native";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";

// Suprime avisos de console que não representam erros reais
LogBox.ignoreLogs([
  "props.pointerEvents is deprecated",
  "The 'navigation' object hasn't been initialized yet",
]);

// Importações — Fluxo do Candidato
import CadastroCandidato from "./candidato/CadastroCandidato";
import HomeCandidato from "./candidato/HomeCandidato";
import FeedCandidato from "./candidato/screen/FeedCandidato";
import VagasCandidato from "./candidato/screen/VagasCandidato";
import EntrevistasCandidatos from "./candidato/screen/EntrevistasCandidatos";
import PerfilCandidato from "./candidato/screen/PerfilCandidato";
import CandidaturaCandidato from "./candidato/screen/cards/CandidaturaCandidato";
import CandidatoSegue from "./candidato/screen/CandidatoSegue";
import EditarPerfilCandidato from "./candidato/screen/cards/EditarPerfilCandidato";
import DocumentosCandidato from "./candidato/screen/cards/DocumentosCandidato";
import DetalhesVagaCandidato from "./candidato/screen/cards/DetalhesVagaCandidato";
import AreaAtuacao from "./candidato/screen/cards/AreaAtuacao";

// Importações — Fluxo da Empresa
import CadastroEmpresa from "./empresa/CadastroEmpresa";
import HomeEmpresa from "./empresa/HomeEmpresa";
import PerfilEmpresa from "./empresa/screen/PerfilEmpresa";
import EditarPerfilEmpresa from "./empresa/screen/cards/EditarPerfilEmpresa";
import AdicionarVaga from "./empresa/screen/cards/AdicionarVaga";
import VagasPublicadas from "./empresa/screen/cards/VagasPublicadas";
import DetalhesVagaEmpresa from "./empresa/screen/cards/DetalhesVagaEmpresa";
import ProcessoSeletivo from "./empresa/screen/cards/ProcessoSeletivo";
import ComentariosEmpresas from "./empresa/screen/cards/ComentariosEmpresas";
import InformacoesEmpresa from "./empresa/screen/cards/InformacoesEmpresa";
import EntrevistasEmpresa from "./empresa/screen/EntrevistasEmpresa";

// Importações — Chat e Chamadas da Empresa
import ChatExterno from "./empresa/chat_empresa/ChatExterno";
import ChatInterno from "./empresa/chat_empresa/ChatInterno";
import BossCall from "./empresa/chamadas_empresa/BossCall";
import Efetuadas from "./empresa/chamadas_empresa/Efetuadas";
import Recebidas from "./empresa/chamadas_empresa/Recebidas";
import AudioVideo from "./empresa/chamadas_empresa/AudioVideo";
import ContatosEmpresa from "./empresa/chamadas_empresa/ContatosEmpresa";

// Importações — Documentos da Empresa
import SolicitarDocumentos from "./empresa/screen/documentos/SolicitarDocumentos";
import SolicitacoesEnviadas from "./empresa/screen/documentos/SolicitacoesEnviadas";
import SolicitacoesRecebidas from "./empresa/screen/documentos/SolicitacoesRecebidas";
import SolicitacoesFinalizadas from "./empresa/screen/documentos/SolicitacoesFinalizadas";

// Importações — Componentes Globais
import Login from "./components/Login";
import RecuperarSenha from "./components/RecuperarSenha";
import VideoChamada from "./components/VideoChamada";
import NotificacoesGlobal from "./components/notificacoes/NotificacoesGlobal";

import "react-native-url-polyfill/auto";
import { supabase } from "./lib/supabase";

const Pilha = createNativeStackNavigator();

// Captura erros de renderização e exibe mensagem amigável ao usuário
class FronteiradeErro extends React.Component {
  state = { temErro: false };

  static getDerivedStateFromError(erro) {
    return { temErro: true };
  }

  componentDidCatch(erro, informacoes) {
    console.log("Erro capturado:", erro, informacoes);
  }

  render() {
    if (this.state.temErro) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Algo deu errado. Tente recarregar o app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Tela inicial com opções de entrar como candidato, empresa ou fazer login
function Inicio({ navigation }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={estilos.areaSegura}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={estilos.containerRolavel}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.logoBase}>
              Achei<Text style={{ color: "#4CAF50" }}>Vaga</Text>
            </Text>
            <Text style={estilos.slogan}>
              Encontre o emprego ideal ou o talento perfeito.
            </Text>
          </View>
          <View style={estilos.containerBotoes}>
            <TouchableOpacity
              style={[estilos.botao, { backgroundColor: "#2196F3" }]}
              onPress={() => navigation.navigate("CadastroCandidato")}
            >
              <Text style={estilos.textoBranco}>Sou Candidato</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.botao, { backgroundColor: "#4CAF50" }]}
              onPress={() => navigation.navigate("CadastroEmpresa")}
            >
              <Text style={estilos.textoBranco}>Sou Empresa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.botao, estilos.contorno, { borderColor: "#2196F3" }]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={{ color: "#2196F3", fontSize: 20, fontWeight: "bold" }}>
                Fazer Login
              </Text>
            </TouchableOpacity>
          </View>
          <View style={estilos.rodape}>
            <Text style={estilos.textoRodape}>
              Powered by{" "}
              <Text style={{ color: "#2196F3", fontWeight: "bold" }}>Cloud Brasil</Text>
            </Text>
            <Text style={[estilos.textoRodape, { color: "#4CAF50", marginTop: 2 }]}>
              PRATICUM ET UTILE, SEMPER ORIGINALE
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [sessao, setSessao] = useState(null);
  const refNavegacao = useRef();
  const navegacaoPendente = useRef(null); // Fila para navegação quando o navigator ainda não está pronto

  // Configuração de deep links para abrir rotas específicas pelo URL do app
  const configuracaoLink = {
    prefixes: ["acheivaga://", "exp://192.168.100.2:8081"],
    config: {
      screens: {
        Inicio: "",
        Login: "login",
        CadastroCandidato: "cadastrocandidato",
        CadastroEmpresa: "cadastroempresa",
        HomeCandidato: "homecandidato",
        HomeEmpresa: "homeempresa",
        RecuperarSenha: "recuperarsenha",
      },
    },
  };

  // Inicializa a sessão e ouve mudanças de autenticação e deep links
  useEffect(() => {
    // Verifica sessão já existente ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
    });

    // Escuta eventos de login/logout do Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      setSessao(session);
    });

    // Processa o deep link ao abrir o app via URL externa
    const processarUrl = async (evento) => {
      let { queryParams } = Linking.parse(evento.url.replace("#", "?"));
      if (queryParams?.access_token && queryParams?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: queryParams.access_token,
          refresh_token: queryParams.refresh_token,
        });
        if (error) console.error("Erro ao setar sessão via link:", error);
      }
    };

    const ouvintUrl = Linking.addEventListener("url", processarUrl);
    Linking.getInitialURL().then((url) => {
      if (url) processarUrl({ url });
    });

    return () => {
      subscription.unsubscribe();
      ouvintUrl.remove();
    };
  }, []);

  // Navega automaticamente com base na sessão do usuário e tipo de conta
  useEffect(() => {
    if (sessao !== null) {
      if (refNavegacao.current?.isReady()) {
        realizarNavegacao(sessao);
      } else {
        navegacaoPendente.current = sessao;
      }
    }
  }, [sessao]);

  // Define para qual tela navegar com base no tipo de usuário (candidato ou empresa)
  const realizarNavegacao = (sessaoAtual) => {
    if (sessaoAtual) {
      const tipo = sessaoAtual.user?.user_metadata?.tipo;
      const rota = tipo === "candidato" ? "HomeCandidato"
                 : tipo === "empresa"   ? "HomeEmpresa"
                 : "Inicio";
      refNavegacao.current.reset({ index: 0, routes: [{ name: rota }] });
    } else {
      refNavegacao.current.reset({ index: 0, routes: [{ name: "Inicio" }] });
    }
  };

  return (
    <FronteiradeErro>
      <NavigationContainer
        ref={refNavegacao}
        linking={configuracaoLink}
        onReady={() => {
          // Executa navegação que estava aguardando o navigator ficar pronto
          if (navegacaoPendente.current) {
            realizarNavegacao(navegacaoPendente.current);
            navegacaoPendente.current = null;
          }
        }}
      >
        <Pilha.Navigator screenOptions={{ headerShown: false }}>
          <Pilha.Screen name="Inicio" component={Inicio} />

          {/* Componentes globais */}
          <Pilha.Screen name="Login" component={Login} />
          <Pilha.Screen name="RecuperarSenha" component={RecuperarSenha} />

          {/* Fluxo do Candidato */}
          <Pilha.Screen name="CadastroCandidato" component={CadastroCandidato} />
          <Pilha.Screen name="HomeCandidato" component={HomeCandidato} />
          <Pilha.Screen name="FeedCandidato" component={FeedCandidato} />
          <Pilha.Screen name="VagasCandidato" component={VagasCandidato} />
          <Pilha.Screen name="EntrevistasCandidatos" component={EntrevistasCandidatos} />
          <Pilha.Screen name="PerfilCandidato" component={PerfilCandidato} />
          <Pilha.Screen name="EditarPerfilCandidato" component={EditarPerfilCandidato} />
          <Pilha.Screen name="DetalhesVagaCandidato" component={DetalhesVagaCandidato} />
          <Pilha.Screen name="DocumentosCandidato" component={DocumentosCandidato} />
          <Pilha.Screen name="AreaAtuacao" component={AreaAtuacao} />
          <Pilha.Screen name="CandidaturaCandidato" component={CandidaturaCandidato} />
          <Pilha.Screen name="CandidatoSegue" component={CandidatoSegue} />

          {/* Fluxo da Empresa */}
          <Pilha.Screen name="CadastroEmpresa" component={CadastroEmpresa} />
          <Pilha.Screen name="HomeEmpresa" component={HomeEmpresa} />
          <Pilha.Screen name="PerfilEmpresa" component={PerfilEmpresa} />
          <Pilha.Screen name="EditarPerfilEmpresa" component={EditarPerfilEmpresa} />
          <Pilha.Screen name="AdicionarVaga" component={AdicionarVaga} />
          <Pilha.Screen name="VagasPublicadas" component={VagasPublicadas} />
          <Pilha.Screen name="DetalhesVagaEmpresa" component={DetalhesVagaEmpresa} />
          <Pilha.Screen name="ProcessoSeletivo" component={ProcessoSeletivo} />
          <Pilha.Screen name="EntrevistasEmpresa" component={EntrevistasEmpresa} />
          <Pilha.Screen name="ComentariosEmpresas" component={ComentariosEmpresas} />
          <Pilha.Screen name="InformacoesEmpresa" component={InformacoesEmpresa} />

          {/* Documentos da Empresa */}
          <Pilha.Screen name="SolicitarDocumentos" component={SolicitarDocumentos} />
          <Pilha.Screen name="SolicitacoesEnviadas" component={SolicitacoesEnviadas} />
          <Pilha.Screen name="SolicitacoesRecebidas" component={SolicitacoesRecebidas} />
          <Pilha.Screen name="SolicitacoesFinalizadas" component={SolicitacoesFinalizadas} />

          {/* Chamadas da Empresa */}
          <Pilha.Screen name="BossCall" component={BossCall} />
          <Pilha.Screen name="Efetuadas" component={Efetuadas} />
          <Pilha.Screen name="Recebidas" component={Recebidas} />
          <Pilha.Screen name="AudioVideo" component={AudioVideo} />
          <Pilha.Screen name="ContatosEmpresa" component={ContatosEmpresa} />

          {/* Chat da Empresa */}
          <Pilha.Screen name="ChatInterno" component={ChatInterno} />
          <Pilha.Screen name="ChatExterno" component={ChatExterno} />

          {/* Videochamada e Notificações */}
          <Pilha.Screen name="VideoChamada" component={VideoChamada} />
          <Pilha.Screen name="NotificacoesGlobal" component={NotificacoesGlobal} />
        </Pilha.Navigator>
      </NavigationContainer>
    </FronteiradeErro>
  );
}

const estilos = StyleSheet.create({
  areaSegura: { flex: 1, backgroundColor: "#fff" },
  containerRolavel: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  cabecalho: { alignItems: "center", marginBottom: 50 },
  logoBase: { fontSize: 48, fontWeight: "bold", color: "#0D47A1" },
  slogan: { fontSize: 16, textAlign: "center", marginTop: 10, color: "#0D47A1" },
  containerBotoes: { gap: 15 },
  botao: {
    height: 65,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" }
      : { elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }),
  },
  contorno: { backgroundColor: "transparent", borderWidth: 2 },
  textoBranco: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  rodape: { marginTop: 60, alignItems: "center" },
  textoRodape: { fontSize: 14, color: "#999" },
});
