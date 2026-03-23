import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";

// Componente invisível que gerencia o registro de push notifications
// Deve ser incluído na tela principal para inicializar o token automaticamente
export default function NotificacoesPush() {
  useEffect(() => {
    async function inicializarPush() {
      try {
        // Push não funciona na web
        if (Platform.OS === 'web') return;

        // Configura o canal de notificação no Android
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            enableLights: true,
            enableVibrate: true,
            showBadge: true,
            sound: "default",
          });
        }

        // Push só funciona em dispositivo físico, não em emulador
        if (!Device.isDevice) {
          console.warn("Push notifications só funcionam em dispositivos físicos.");
          return;
        }

        // Solicita permissão de notificação ao usuário
        const { status: statusExistente } = await Notifications.getPermissionsAsync();
        let statusFinal = statusExistente;

        if (statusExistente !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          statusFinal = status;
        }

        if (statusFinal !== "granted") {
          console.warn("Permissão de push não concedida.");
          return;
        }

        // Obtém o Project ID configurado no app (necessário para gerar o token Expo)
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        if (!projectId) {
          console.error("ProjectId não encontrado no Constants.");
          return;
        }

        // Gera o token de push do dispositivo
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

        if (!token) {
          console.error("Não foi possível gerar o token de push.");
          return;
        }

        // Verifica o usuário autenticado antes de salvar o token
        const { data: { user }, error: erroUsuario } = await supabase.auth.getUser();

        if (erroUsuario || !user) {
          console.error("Usuário não autenticado:", erroUsuario);
          return;
        }

        // Atualiza o token nas tabelas de candidato e empresa (conforme qual existir)
        const tabelas = ["cadastro_candidato", "cadastro_empresa"];

        for (const tabela of tabelas) {
          const { data } = await supabase
            .from(tabela)
            .select("push_token")
            .eq("user_id", user.id)
            .maybeSingle();

          if (data) {
            await supabase.from(tabela).update({ push_token: token }).eq("user_id", user.id);
          }
        }
      } catch (erro) {
        console.error("Erro ao inicializar push:", erro);
      }
    }

    inicializarPush();
  }, []);

  return null; // Componente invisível — sem renderização visual
}
