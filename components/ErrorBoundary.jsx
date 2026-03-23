import React from 'react';
import { Text, View } from 'react-native';

// Componente de segurança que captura erros de renderização e evita crash total do app
class FronteiradeErro extends React.Component {
  constructor(props) {
    super(props);
    this.state = { temErro: false };
  }

  static getDerivedStateFromError(erro) {
    return { temErro: true, erro };
  }

  render() {
    if (this.state.temErro) {
      return (
        <View>
          <Text>Algo deu errado: {this.state.erro?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default FronteiradeErro;
