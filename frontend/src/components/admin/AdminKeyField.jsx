import { Checkbox, TextField } from '../ui'

/** Campo da chave de administrador + "lembrar", usado nas páginas de administração (com useAdminKey). */
export function AdminKeyField({ adminKey, setAdminKey, remember, setRemember, error }) {
  return (
    <>
      <TextField
        label="Chave de administrador"
        type="password"
        autoComplete="off"
        value={adminKey}
        onChange={(event) => setAdminKey(event.target.value)}
        error={error}
      />
      <Checkbox
        label="Lembrar a chave até fechar esta aba"
        checked={remember}
        onChange={(event) => setRemember(event.target.checked)}
      />
    </>
  )
}
