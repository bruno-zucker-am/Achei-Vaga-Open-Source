// Ranking global de negócios — em desenvolvimento.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function FornecedoresEmpresa() {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="trophy" size={50} color="#FFD700" />
      <Text style={styles.title}>Global Business Ranking</Text>
      <Text style={styles.posicao}>Sua empresa está no Top 10%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b10",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 10 },
  posicao: { color: "#39ff14", marginTop: 5, fontSize: 14 },
});
