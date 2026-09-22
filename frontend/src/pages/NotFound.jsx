import { Button, Icon } from '../components/ui'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container state">
        <Icon name="paw" size={48} />
        <h1 className="t-heading-lg" style={{ color: 'var(--ink)' }}>Página não encontrada</h1>
        <p>Talvez esse endereço tenha mudado. Que tal conhecer os pets disponíveis?</p>
        <Button to="/adotar">Ver pets</Button>
      </div>
    </section>
  )
}
