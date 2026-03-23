// Visibilidade do candidato — mostra quantas vezes o currículo foi visualizado e quais empresas demonstraram interesse.
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function VisualizacoesCandidatos() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Visibilidade</Text>
        <MaterialCommunityIcons name="eye-check-outline" size={24} color="#39ff14" />
      </View>

      {/* Box com Brilho Neon */}
      <View style={styles.boxGlow}>
        <Text style={styles.label}>SEU CURRÍCULO FOI VISTO</Text>
        <Text style={styles.count}>24 VEZES</Text>
        <Text style={styles.subLabel}>Nos últimos 7 dias</Text>
      </View>

      <View style={styles.listaEmpresas}>
        <Text style={styles.subTitle}>Empresas interessadas:</Text>
        
        <View style={styles.item}>
          <View style={styles.logoMini}>
             <MaterialCommunityIcons name="office-building" size={20} color="#00f2ff" />
          </View>
          <View style={styles.infoEmpresa}>
            <Text style={styles.txtEmpresa}>Avanade Brasil</Text>
            <Text style={styles.txtHora}>Visualizado às 10:30h</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#1e293b" />
        </View>

        <View style={styles.item}>
          <View style={styles.logoMini}>
             <MaterialCommunityIcons name="office-building" size={20} color="#00f2ff" />
          </View>
          <View style={styles.infoEmpresa}>
            <Text style={styles.txtEmpresa}>Accenture</Text>
            <Text style={styles.txtHora}>Visualizado Ontem</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#1e293b" />
        </View>

        <View style={styles.item}>
          <View style={styles.logoMini}>
             <MaterialCommunityIcons name="office-building" size={20} color="#00f2ff" />
          </View>
          <View style={styles.infoEmpresa}>
            <Text style={styles.txtEmpresa}>Zucker Corp</Text>
            <Text style={styles.txtHora}>Visualizado há 2 dias</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#1e293b" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10", padding: 20 },
  header: { marginTop: 40, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: "#FFF", fontSize: 22, fontWeight: "800" },
  boxGlow: { 
    padding: 30, 
    alignItems: 'center', 
    backgroundColor: '#161b22',
    borderWidth: 1, 
    borderColor: '#39ff14', 
    borderRadius: 20,
    shadowColor: "#39ff14",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 35
  },
  label: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  count: { color: '#39ff14', fontSize: 38, fontWeight: '900', marginTop: 10 },
  subLabel: { color: '#64748b', fontSize: 11, marginTop: 5 },
  
  subTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 20 },
  item: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1e293b' 
  },
  logoMini: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    backgroundColor: '#0a0b10', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  infoEmpresa: { flex: 1 },
  txtEmpresa: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  txtHora: { color: '#64748b', fontSize: 12, marginTop: 2 }
});