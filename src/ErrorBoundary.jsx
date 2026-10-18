import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Erro inesperado na interface do InPETU Connect.', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="app-error-boundary" role="alert">
      <h1>Algo deu errado</h1>
      <p>A página encontrou um erro inesperado. Tente novamente.</p>
      <button type="button" className="button button-primary" onClick={() => this.setState({ hasError: false })}>
        Tentar de novo
      </button>
    </main>
  }
}
